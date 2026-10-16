import { IconCamera, IconEye, IconFile, IconFiles, IconPencil, IconPhoto, IconShare, IconTrash, IconUpload } from '@tabler/icons-react-native';
import { DOCUMENT_CATEGORIES, MAX_FILE_BYTES, type DocumentCategory } from '@vakil/shared';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Image, Linking, Modal, Platform, Pressable, View } from 'react-native';
import { DocumentTile } from '@/components/DocumentTile';
import { ErrorState } from '@/components/ErrorState';
import { IconButton } from '@/components/ui/IconButton';
import { IconX } from '@tabler/icons-react-native';
import { ActionSheet } from '@/components/ui/ActionSheet';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SheetOption } from '@/components/ui/SheetOption';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { TextField } from '@/components/ui/TextField';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { useDocumentMutations, useDocuments } from '@/hooks/useExtras';
import { errorMessage } from '@/services/api';
import { localDocumentCopy } from '@/services/extras';
import type { CaseDocument } from '@/services/types';

const CATEGORY_LABEL: Record<DocumentCategory, string> = { petition: 'Petition', order: 'Court order', evidence: 'Evidence', vakalatnama: 'Vakalatnama', other: 'Other' };
const CATEGORIES = DOCUMENT_CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABEL[c] }));

type Picked = { fileName: string; mimeType: string; sizeBytes: number; uri: string };

/** SCR-22 Documents tab: add from files / gallery / camera, rename, share, delete with Undo (FR-DOC). */
export function CaseDocumentsTab({ caseId }: { caseId: string }) {
  const toast = useToast();
  const q = useDocuments(caseId);
  const m = useDocumentMutations(caseId);
  const docs = q.data ?? [];

  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [category, setCategory] = useState<DocumentCategory>('other');
  const [name, setName] = useState('');
  const [menu, setMenu] = useState<CaseDocument | null>(null);
  const [renaming, setRenaming] = useState<CaseDocument | null>(null);
  const [viewing, setViewing] = useState<CaseDocument | null>(null);

  const choose = (p: Picked) => {
    if (p.sizeBytes > MAX_FILE_BYTES) return toast.show({ type: 'error', message: 'That file is larger than 20 MB.' });
    setPicked(p);
    setName(p.fileName);
    setCategory('other');
  };

  const fromFiles = async () => {
    setPicking(false);
    try {
      const r = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      const a = r.assets?.[0];
      if (!r.canceled && a) choose({ fileName: a.name, mimeType: a.mimeType ?? 'application/octet-stream', sizeBytes: a.size ?? 0, uri: a.uri });
    } catch {
      toast.show({ type: 'error', message: "Couldn't open your files." });
    }
  };

  const fromImages = async (camera: boolean) => {
    setPicking(false);
    try {
      if (camera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) return toast.show({ type: 'error', message: 'Allow camera access in your phone settings to scan.' });
      }
      const r = await (camera ? ImagePicker.launchCameraAsync({ quality: 0.7 }) : ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 }));
      const a = r.assets?.[0];
      if (!r.canceled && a) choose({ fileName: a.fileName ?? `Scan ${new Date().toISOString().slice(0, 10)}.jpg`, mimeType: a.mimeType ?? 'image/jpeg', sizeBytes: a.fileSize ?? 0, uri: a.uri });
    } catch {
      toast.show({ type: 'error', message: "Couldn't open that source." });
    }
  };

  const upload = async () => {
    if (!picked) return;
    try {
      await m.add.mutateAsync({ ...picked, fileName: name.trim() || picked.fileName, category });
      toast.show({ type: 'success', message: 'Document added' });
      setPicked(null);
    } catch (e) {
      toast.show({ type: 'error', message: errorMessage(e), actionLabel: 'Retry', onAction: upload });
    }
  };

  /** Images open in an in-app viewer; other files go to the device's own viewer via the share sheet. */
  const view = (d: CaseDocument) => {
    if (!d.uri) return toast.show({ type: 'info', message: "This file isn't available right now. Pull to refresh and try again." });
    if (d.mimeType.startsWith('image/')) setViewing(d);
    else void share(d);
  };

  /** d.uri is a short-lived signed URL; the share sheet needs a local copy, so it is downloaded first. */
  const share = async (d: CaseDocument) => {
    try {
      if (Platform.OS === 'web' && d.uri) return void Linking.openURL(d.uri);
      if (d.uri && (await Sharing.isAvailableAsync())) await Sharing.shareAsync(await localDocumentCopy(d), { mimeType: d.mimeType });
      else toast.show({ type: 'info', message: 'Sharing is not available for this file.' });
    } catch {
      toast.show({ type: 'error', message: "Couldn't share this file." });
    }
  };

  const remove = async (d: CaseDocument) => {
    try {
      await m.remove.mutateAsync(d.id);
      toast.show({ type: 'info', message: 'Document deleted', actionLabel: 'Undo', onAction: () => m.restore.mutate(d) });
    } catch (e) {
      toast.show({ type: 'error', message: errorMessage(e) });
    }
  };

  const rename = async () => {
    if (!renaming) return;
    try {
      await m.rename.mutateAsync({ id: renaming.id, name });
      setRenaming(null);
    } catch (e) {
      toast.show({ type: 'error', message: errorMessage(e) });
    }
  };

  if (q.isError && !q.data) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;

  return (
    <View className="gap-3">
      {q.isLoading ? (
        <SkeletonCard />
      ) : docs.length === 0 ? (
        <EmptyState icon={IconFiles} title="No documents yet" message="Keep petitions, orders and evidence together. Max 20 MB each." actionLabel="Add document" onAction={() => setPicking(true)} />
      ) : (
        <>
          <SectionHeader title={`Documents · ${docs.length}`} actionLabel="Add" onAction={() => setPicking(true)} first />
          {docs.map((d) => <DocumentTile key={d.id} variant="list" name={d.fileName} mimeType={d.mimeType} sizeBytes={d.sizeBytes} date={d.createdAt.slice(0, 10)} onPress={() => view(d)} onMore={() => setMenu(d)} />)}
        </>
      )}

      <BottomSheet open={picking} onClose={() => setPicking(false)} title="Add document">
        <View className="px-2 pb-4">
          <SheetOption label="Choose a file" description="PDF, Word or any file" icon={IconFile} control="none" onPress={fromFiles} />
          <SheetOption label="Photo library" icon={IconPhoto} control="none" onPress={() => fromImages(false)} />
          <SheetOption label="Scan with camera" icon={IconCamera} control="none" onPress={() => fromImages(true)} />
        </View>
      </BottomSheet>

      <BottomSheet open={!!picked} onClose={() => setPicked(null)} title="Add to this case" footer={<Button label="Upload" onPress={upload} loading={m.add.isPending} fullWidth haptic="light" />}>
        <View className="gap-5 px-5 pb-3">
          <TextField label="File name" value={name} onChangeText={setName} />
          <Select label="Category" value={category} options={CATEGORIES} onChange={setCategory} />
        </View>
      </BottomSheet>

      <ActionSheet
        open={!!menu}
        onClose={() => setMenu(null)}
        title={menu?.fileName}
        actions={
          menu
            ? [
                { key: 'view', label: 'View', icon: IconEye, onPress: () => (setMenu(null), view(menu)) },
                { key: 'share', label: 'Share', icon: IconShare, onPress: () => (setMenu(null), share(menu)) },
                { key: 'rename', label: 'Rename', icon: IconPencil, onPress: () => (setName(menu.fileName), setRenaming(menu), setMenu(null)) },
                { key: 'delete', label: 'Delete', icon: IconTrash, destructive: true, onPress: () => (setMenu(null), remove(menu)) },
              ]
            : []
        }
      />

      <Modal visible={!!viewing} transparent animationType="fade" onRequestClose={() => setViewing(null)} statusBarTranslucent>
        <Pressable className="flex-1 items-center justify-center bg-black/90" onPress={() => setViewing(null)} accessibilityLabel="Close preview">
          {viewing?.uri ? <Image source={{ uri: viewing.uri }} resizeMode="contain" style={{ width: '100%', height: '80%' }} accessibilityLabel={viewing.fileName} /> : null}
        </Pressable>
        <View className="absolute right-3 top-12">
          <IconButton icon={IconX} accessibilityLabel="Close" variant="filled" onPress={() => setViewing(null)} />
        </View>
      </Modal>

      <BottomSheet open={!!renaming} onClose={() => setRenaming(null)} title="Rename document" footer={<Button label="Save" onPress={rename} loading={m.rename.isPending} fullWidth haptic="light" />}>
        <View className="px-5 pb-3">
          <TextField label="File name" value={name} onChangeText={setName} autoFocus />
        </View>
      </BottomSheet>
    </View>
  );
}

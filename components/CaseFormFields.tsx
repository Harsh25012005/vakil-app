import { IconBuildingBank } from '@tabler/icons-react-native';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useClients } from '@/hooks/useClients';
import { useCaseTypes, useCourts, useListMutations } from '@/hooks/useLists';
import { errorMessage } from '@/services/api';
import { ecourtsCaseTypesQuery, fetchCaseByCnr, type DirectoryCourt, type EcourtsCase } from '@/services/ecourts';
import { caseTypesFor } from '@/utils/caseTypes';
import { SheetPicker, type SheetOption } from './SheetPicker';
import { formatShortDate, todayISO } from '@/utils/date';
import { Card } from './ui/Card';
import { KeyValueRow } from './ui/KeyValueRow';
import { formPatchFromEcourts, type CaseFormErrors, type CaseFormValues } from '@/utils/caseForm';
import { QuickClientSheet } from './QuickClientSheet';
import { DatePicker } from './ui/DatePicker';
import { LinkText } from './ui/LinkText';
import { MultiSelect } from './ui/MultiSelect';
import { Select } from './ui/Select';
import { Text } from './ui/Text';
import { TextField } from './ui/TextField';
import { useToast } from './ui/Toast';

type Props = {
  values: CaseFormValues;
  errors: CaseFormErrors;
  onChange: (patch: Partial<CaseFormValues>) => void;
  /** Add case also sets the first hearing; on Edit, hearings are managed on their own tab. */
  mode?: 'add' | 'edit';
  /** The case the Add case finder already fetched from eCourts (shown, not fetched again). */
  initialFetched?: EcourtsCase | null;
  /** The court came from the court search: an eCourts re-fetch keeps it. */
  keepCourt?: boolean;
  /** The court picked in Add case: the case type list shows that court's types. */
  court?: DirectoryCourt | null;
};

/** Case type option values for eCourts types not yet in the advocate's list. */
const EC_PREFIX = 'ec:';

/** The one case form, shared by Add case and Edit case. Client is optional; the rest is required. */
export function CaseFormFields({ values, errors, onChange, mode = 'edit', initialFetched = null, keepCourt = false, court = null }: Props) {
  const toast = useToast();
  const courts = useCourts();
  const types = useCaseTypes();
  const clients = useClients();
  const { addCourt, addCaseType } = useListMutations();
  const [addingClient, setAddingClient] = useState(false);
  const { colors } = useTheme();
  const [fetching, setFetching] = useState(false);
  /** Why the last eCourts lookup failed, shown under the CNR field until the next try. */
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetched, setFetched] = useState<EcourtsCase | null>(initialFetched);
  // Every case type eCourts knows, besides the advocate's own list; searchable by short code.
  const ecTypes = useQuery(ecourtsCaseTypesQuery);
  const courtTypes = useMemo(() => caseTypesFor(court, ecTypes.data ?? []), [court, ecTypes.data]);
  const caseTypeOptions = useMemo<SheetOption[]>(() => {
    const own = (types.data ?? []).map((t) => ({ value: t.id, label: t.name, section: 'Your case types' }));
    const have = new Set(own.map((o) => o.label.toLowerCase()));
    const more = courtTypes
      .filter((t) => !have.has(t.name.toLowerCase()))
      .map((t) => ({ value: `${EC_PREFIX}${t.code}`, label: t.name, code: t.code, section: court ? 'Case types of this court' : 'More case types' }));
    return [...own, ...more];
  }, [types.data, courtTypes, court]);
  // The CNR the form opened with (edit screen) is not re-fetched; only a newly typed one is.
  const fetchedCnr = useRef(values.cnr);

  /** FR-CASE-03: fills the form from eCourts. Court and case type are matched by name, or added. */
  const fetchFromEcourts = async (cnr: string) => {
    fetchedCnr.current = cnr;
    setFetching(true);
    setFetchError(null);
    try {
      const d = await fetchCaseByCnr(cnr);
      setFetched(d);
      const patch = formPatchFromEcourts(d, values, todayISO());
      // A court picked in the court search stays; otherwise the court is matched by name, or added.
      const courtName = [d.courtName, d.district].filter(Boolean).join(', ');
      if (courtName && !keepCourt) patch.courtId = (await addCourt.mutateAsync(courtName)).id;
      if (d.caseType) patch.caseTypeId = (await addCaseType.mutateAsync(d.caseType)).id;
      onChange(patch);
      toast.show({ type: 'success', message: 'Details filled from eCourts. Check them before saving.' });
    } catch (err) {
      setFetchError(errorMessage(err));
    } finally {
      setFetching(false);
    }
  };

  // Auto-fetch as soon as a full 16-character CNR is entered.
  useEffect(() => {
    if (values.cnr.length === 16 && values.cnr !== fetchedCnr.current && !fetching) void fetchFromEcourts(values.cnr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.cnr]);

  return (
    <View className="gap-5">
      <TextField
        label="CNR number"
        required
        value={values.cnr}
        onChangeText={(cnr) => onChange({ cnr: cnr.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
        error={errors.cnr}
        placeholder="16 characters"
        autoCapitalize="characters"
        maxLength={16}
        showCounter
        helper="Found on the eCourts case status page"
      />
      {fetching ? (
        <View className="-mt-3 flex-row items-center gap-2 px-1">
          <ActivityIndicator size="small" color={colors.primary} />
          <Text variant="body-sm" tone="secondary">
            Fetching case details from eCourts…
          </Text>
        </View>
      ) : fetchError && values.cnr.length === 16 ? (
        <View className="-mt-3 gap-1 px-1">
          <Text variant="body-sm" tone="error">
            {fetchError}
          </Text>
          <LinkText label="Try again" onPress={() => void fetchFromEcourts(values.cnr)} />
        </View>
      ) : null}
      {fetched && !fetching ? (
        <Card variant="subtle" className="-mt-2 gap-1">
          <Text variant="overline" tone="primary">
            From eCourts
          </Text>
          <KeyValueRow label="Case no." value={fetched.caseNumber} divider />
          {fetched.filingNumber && fetched.filingNumber !== fetched.caseNumber ? <KeyValueRow label="Filing no." value={fetched.filingNumber} divider /> : null}
          <KeyValueRow label="Status" value={fetched.status} divider />
          <KeyValueRow label="Stage" value={fetched.stage} divider />
          <KeyValueRow label="Court" value={[fetched.courtName, fetched.courtNo && `Court no. ${fetched.courtNo}`].filter(Boolean).join(' · ')} divider />
          <KeyValueRow label="Judge" value={fetched.judge} divider />
          <KeyValueRow label="Petitioner" value={fetched.petitioners.join(', ')} divider />
          <KeyValueRow label="Respondent" value={fetched.respondents.join(', ')} divider />
          {fetched.petitionerAdvocates.length || fetched.respondentAdvocates.length ? (
            <KeyValueRow label="Advocates" value={[...fetched.petitionerAdvocates, ...fetched.respondentAdvocates].join(', ')} divider />
          ) : null}
          <KeyValueRow label="Last hearing" value={fetched.lastHearingDate ? formatShortDate(fetched.lastHearingDate) : undefined} divider />
          <KeyValueRow label="Next hearing" value={fetched.nextHearingDate ? formatShortDate(fetched.nextHearingDate) : undefined} divider={fetched.orders.length > 0} />
          {fetched.orders.length ? <KeyValueRow label="Orders" value={`${fetched.orders.length} on eCourts, listed in the case after saving`} /> : null}
        </Card>
      ) : null}
      <TextField label="Case title" required value={values.title} onChangeText={(title) => onChange({ title })} error={errors.title} placeholder="Petitioner v. Respondent" autoCapitalize="words" returnKeyType="next" clearable />
      <SheetPicker
        label="Case type"
        required
        placeholder="Select case type"
        sheetTitle="Select case type"
        searchPlaceholder="Name or short form (SCA, OA)"
        value={values.caseTypeId || null}
        onChange={async (v) => {
          if (!v.startsWith(EC_PREFIX)) return onChange({ caseTypeId: v });
          // An eCourts case type not in the advocate's list yet: added on pick.
          const t = (ecTypes.data ?? []).find((x) => x.code === v.slice(EC_PREFIX.length));
          if (!t) return;
          try {
            onChange({ caseTypeId: (await addCaseType.mutateAsync(t.name)).id });
          } catch (err) {
            toast.show({ type: 'error', message: errorMessage(err) });
          }
        }}
        options={caseTypeOptions}
        loading={types.isLoading}
        error={errors.caseTypeId}
        onAddNew={async (name) => {
          if (!name) return;
          try {
            onChange({ caseTypeId: (await addCaseType.mutateAsync(name)).id });
          } catch (err) {
            toast.show({ type: 'error', message: errorMessage(err) });
          }
        }}
        addNewLabel="Add case type"
      />
      <Select
        label="Court"
        required
        placeholder="Select court"
        leadingIcon={IconBuildingBank}
        value={values.courtId || null}
        onChange={(courtId) => onChange({ courtId })}
        options={(courts.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
        error={errors.courtId}
        onAddNew={async (name) => {
          if (!name) return;
          try {
            onChange({ courtId: (await addCourt.mutateAsync(name)).id });
          } catch (err) {
            toast.show({ type: 'error', message: errorMessage(err) });
          }
        }}
        addNewLabel="Add court"
      />
      <DatePicker label="Filing date" required value={values.filingDate} onChange={(filingDate) => onChange({ filingDate })} error={errors.filingDate} showQuickChips={false} />
      {/* No next-date field: hearing dates come from the court (eCourts) and update by themselves. */}
      <View className="gap-2">
        <MultiSelect
          label="Client"
          placeholder="Optional. Select client(s)"
          values={values.clientIds}
          onChange={(clientIds) => onChange({ clientIds })}
          options={(clients.data ?? []).map((c) => ({ value: c.id, label: c.fullName, description: `+91 ${c.phone}` }))}
          error={errors.clientIds}
        />
        <LinkText label="New client" variant="chevron" onPress={() => setAddingClient(true)} className="ml-1" />
      </View>
      <QuickClientSheet open={addingClient} onClose={() => setAddingClient(false)} onCreated={(id) => onChange({ clientIds: [...new Set([...values.clientIds, id])] })} />
    </View>
  );
}

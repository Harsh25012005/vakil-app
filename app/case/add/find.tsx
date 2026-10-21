import { IconClipboard, IconSearch } from '@tabler/icons-react-native';
import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { courtMeta } from '@/components/CourtPicker';
import { FormScreen } from '@/components/FormScreen';
import { SheetPicker } from '@/components/SheetPicker';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { LinkText } from '@/components/ui/LinkText';
import { TextField } from '@/components/ui/TextField';
import { useAddCaseFlow } from '@/hooks/useAddCaseFlow';
import { useAdvocate } from '@/hooks/useAuth';
import { useCaseDraft } from '@/hooks/useCaseDraft';
import { useCaseSearch } from '@/hooks/useCaseSearch';
import { errorMessage } from '@/services/api';
import { ecourtsCaseTypesQuery, modesFor, searchCases, SEARCH_MODES, type CaseSearchInput, type SearchMode } from '@/services/ecourts';
import { caseTypesFor } from '@/utils/caseTypes';
import { haptic } from '@/utils/haptics';

const thisYear = new Date().getFullYear();
const isCnr = (s: string) => /^[A-Z0-9]{16}$/.test(s);

/** "1234/2025", "1234 2025", "SCA/1234/2025" -> number + year. */
function numberAndYear(s: string): { number: string; year: number } | null {
  const m = /^(.*?[A-Za-z0-9])\s*[/\s-]\s*(\d{4})$/.exec(s.trim());
  if (!m) return null;
  const year = Number(m[2]);
  if (year < 1950 || year > thisYear + 1) return null;
  const number = m[1]!.replace(/\s+/g, '').split('/').pop()!;
  return /^[A-Za-z0-9.-]{1,30}$/.test(number) ? { number, year } : null;
}

const FIELD: Record<Exclude<SearchMode, 'cnr'>, { label: string; placeholder: string }> = {
  number: { label: 'Case number / year', placeholder: 'e.g. 1234/2025' },
  filing: { label: 'Filing number / year', placeholder: 'e.g. 5678/2025' },
  fir: { label: 'FIR number / year', placeholder: 'e.g. 112/2025' },
  party: { label: 'Party name', placeholder: 'Petitioner or respondent' },
  advocate: { label: 'Advocate name', placeholder: 'e.g. R. K. Shah' },
};

// SCR-14 Add case, step 2: one field for one way of finding the case in the picked court.
export default function AddCaseFind() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const court = useCaseDraft((s) => s.lastDirectoryCourt);
  const advocate = useAdvocate();
  const setResults = useCaseSearch((s) => s.setResults);
  const flow = useAddCaseFlow();

  const allowed = modesFor(court);
  const mode: SearchMode = allowed.includes(params.mode as SearchMode) ? (params.mode as SearchMode) : 'cnr';
  const isName = mode === 'party' || mode === 'advocate';

  // The advocate's own name is the usual advocate search.
  const [value, setValue] = useState(mode === 'advocate' ? (advocate?.fullName ?? '') : '');
  const [caseType, setCaseType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  // Case types of this court only (a tribunal's own, or the court types), also used to keep a
  // tribunal search to that tribunal's cases.
  const types = useQuery({ ...ecourtsCaseTypesQuery, enabled: !!court });
  const courtTypes = useMemo(() => caseTypesFor(court, types.data ?? []), [court, types.data]);
  const scopeTypes = court?.level === 'TRIBUNAL' ? courtTypes.map((t) => t.code) : undefined;

  /** A full CNR is looked up at once: no extra tap. */
  const changeCnr = (v: string) => {
    const next = v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16);
    setValue(next);
    setError(null);
    if (isCnr(next) && next !== value && !flow.opening) void flow.openCase(next);
  };

  const paste = async () => {
    const text = (await Clipboard.getStringAsync().catch(() => '')).toUpperCase().replace(/[^A-Z0-9]/g, '');
    const hit = /[A-Z]{4}\d{12}/.exec(text)?.[0] ?? text.slice(0, 16);
    if (!hit) setError('Nothing to paste. Copy the CNR first.');
    else changeCnr(hit);
  };

  const run = async (input: CaseSearchInput) => {
    setSearching(true);
    setError(null);
    try {
      const res = await searchCases(input);
      setResults(input, res);
      haptic.light();
      router.push('/case/add/results');
    } catch (e) {
      setError(errorMessage(e));
      haptic.warning();
    } finally {
      setSearching(false);
    }
  };

  const submit = () => {
    if (!court) return router.back();
    if (mode === 'cnr') return isCnr(value) ? void flow.openCase(value) : setError('CNR must be 16 letters and numbers.');
    if (isName) {
      if (value.trim().length < 3) return setError('Enter at least 3 letters of the name.');
      return void run({ mode, court, name: value.trim(), side: 'any', status: 'any', scopeTypes });
    }
    const ny = numberAndYear(value);
    if (!ny) return setError(`Enter the number and the year, like ${FIELD[mode].placeholder.replace('e.g. ', '')}.`);
    void run({ mode, court, number: ny.number, year: ny.year, caseTypeCode: caseType || undefined, scopeTypes });
  };

  return (
    <FormScreen
      onBack={() => router.back()}
      eyebrow="Step 2 of 3"
      title={`Find by ${SEARCH_MODES[mode].title.toLowerCase()}`}
      subtitle={court ? `${court.name} · ${courtMeta(court)}` : undefined}
      footer={<Button label={mode === 'cnr' ? 'Find case' : 'Search'} leadingIcon={IconSearch} onPress={submit} loading={searching || !!flow.opening} fullWidth haptic="light" />}
    >
      {mode === 'cnr' ? (
        <TextField
          label="CNR number"
          value={value}
          onChangeText={changeCnr}
          placeholder="e.g. GJAH010012342025"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={16}
          showCounter
          trailingIcon={IconClipboard}
          onTrailingPress={paste}
          trailingAccessibilityLabel="Paste CNR"
          returnKeyType="search"
          onSubmitEditing={submit}
          autoFocus
        />
      ) : (
        <>
          {mode === 'number' ? (
            <>
              <SheetPicker
                label="Case type"
                placeholder="Any case type"
                sheetTitle="Select case type"
                searchPlaceholder="Name or short form (SCA, OA)"
                value={caseType}
                onChange={setCaseType}
                loading={types.isLoading}
                options={[{ value: '', label: 'Any case type' }, ...courtTypes.map((t) => ({ value: t.code, label: t.name, code: t.code }))]}
              />
              {types.isError ? <LinkText label="Couldn't load case types. Try again" onPress={() => void types.refetch()} className="-mt-3" /> : null}
            </>
          ) : null}
          <TextField
            label={FIELD[mode].label}
            value={value}
            onChangeText={(v) => {
              setValue(v);
              setError(null);
            }}
            placeholder={FIELD[mode].placeholder}
            autoCapitalize={isName ? 'words' : 'characters'}
            autoCorrect={false}
            keyboardType={isName ? 'default' : 'numbers-and-punctuation'}
            clearable
            returnKeyType="search"
            onSubmitEditing={submit}
            autoFocus
          />
        </>
      )}

      {error ? <Banner tone="error" message={error} /> : null}
    </FormScreen>
  );
}

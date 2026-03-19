import type { NpiProvidersResponse } from "@atlas/schemas/npi";
import { fetchNpiProviders, type NpiSearchInput } from "@/server/npi-functions";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";

const DEFAULT_LIMIT = 20;

export type NpiFilterForm = {
  providerName: string;
  npi: string;
  city: string;
  state: string;
  specialty: string;
};

const emptyFilters: NpiFilterForm = {
  providerName: "",
  npi: "",
  city: "",
  state: "",
  specialty: "",
};

function toSearchInput(
  f: NpiFilterForm,
  page: number,
): NpiSearchInput {
  return {
    providerName: f.providerName.trim() || undefined,
    npi: f.npi.replace(/\D/g, "") || undefined,
    city: f.city.trim() || undefined,
    state: f.state.trim().toUpperCase().slice(0, 2) || undefined,
    specialty: f.specialty.trim() || undefined,
    limit: DEFAULT_LIMIT,
    skip: page * DEFAULT_LIMIT,
  };
}

export function useNpiProviderSearch() {
  /** Values in the form fields (edits do not trigger API calls). */
  const [draftFilters, setDraftFilters] =
    useState<NpiFilterForm>(emptyFilters);
  /** Last filters applied by clicking Search; drives NPI API requests. */
  const [submittedFilters, setSubmittedFilters] =
    useState<NpiFilterForm | null>(null);
  const [page, setPage] = useState(0);

  const input: NpiSearchInput | null = useMemo(() => {
    if (!submittedFilters) return null;
    return toSearchInput(submittedFilters, page);
  }, [submittedFilters, page]);

  const query = useQuery({
    queryKey: ["npi-providers", submittedFilters, page],
    queryFn: () => fetchNpiProviders({ data: input! }),
    enabled: input !== null,
  });

  const runSearch = useCallback(() => {
    setSubmittedFilters({ ...draftFilters });
    setPage(0);
  }, [draftFilters]);

  const goToPage = useCallback((p: number) => {
    setPage(p);
  }, []);

  return {
    filters: draftFilters,
    setFilters: setDraftFilters,
    runSearch,
    page,
    limit: DEFAULT_LIMIT,
    goToPage,
    hasSearched: submittedFilters !== null,
    ...query,
    data: query.data as NpiProvidersResponse | undefined,
  };
}

"use client";

import { Button } from "@atlas/subframe/components/Button";
import { TextField } from "@atlas/subframe/components/TextField";
import {
  FeatherActivity,
  FeatherHash,
  FeatherMap,
  FeatherMapPin,
  FeatherSearch,
  FeatherUser,
} from "@subframe/core";
import type { NpiFilterForm } from "./useNpiProviderSearch.ts";

type Props = {
  filters: NpiFilterForm;
  onChange: (next: NpiFilterForm) => void;
  onSearch: () => void;
  isSearching: boolean;
};

export function NpiSearchCriteria({
  filters,
  onChange,
  onSearch,
  isSearching,
}: Props) {
  const patch = (partial: Partial<NpiFilterForm>) =>
    onChange({ ...filters, ...partial });

  return (
    <div className="flex w-full flex-col items-start gap-6 rounded-lg border border-solid border-neutral-border bg-default-background px-6 py-6 shadow-sm">
      <span className="text-heading-3 font-heading-3 text-default-font">
        Search criteria
      </span>
      <div className="flex w-full flex-wrap items-end gap-4 mobile:flex-col mobile:flex-nowrap mobile:items-start mobile:justify-start mobile:gap-4">
        <TextField
          className="h-auto min-w-[200px] grow shrink-0 basis-0"
          label="Provider Name"
          helpText=""
          icon={<FeatherUser />}
        >
          <TextField.Input
            placeholder="e.g. John Doe"
            value={filters.providerName}
            onChange={(e) => patch({ providerName: e.target.value })}
          />
        </TextField>
        <TextField
          className="h-auto grow shrink-0 basis-0"
          label="NPI Number"
          helpText=""
          icon={<FeatherHash />}
        >
          <TextField.Input
            placeholder="e.g. 1234567890"
            value={filters.npi}
            onChange={(e) => patch({ npi: e.target.value })}
          />
        </TextField>
        <TextField
          className="h-auto grow shrink-0 basis-0"
          label="City"
          helpText=""
          icon={<FeatherMapPin />}
        >
          <TextField.Input
            placeholder="e.g. San Francisco"
            value={filters.city}
            onChange={(e) => patch({ city: e.target.value })}
          />
        </TextField>
        <TextField
          className="h-auto w-32 flex-none mobile:w-full"
          label="State"
          helpText=""
          icon={<FeatherMap />}
        >
          <TextField.Input
            placeholder="CA"
            value={filters.state}
            maxLength={2}
            onChange={(e) =>
              patch({ state: e.target.value.toUpperCase().slice(0, 2) })
            }
          />
        </TextField>
        <TextField
          className="h-auto min-w-[220px] grow shrink-0 basis-0"
          label="Specialty"
          icon={<FeatherActivity />}
        >
          <TextField.Input
            placeholder="e.g. Family Medicine"
            value={filters.specialty}
            onChange={(e) => patch({ specialty: e.target.value })}
          />
        </TextField>
        <Button
          className="mobile:w-full"
          icon={<FeatherSearch />}
          loading={isSearching}
          onClick={() => onSearch()}
        >
          Search
        </Button>
      </div>
    </div>
  );
}

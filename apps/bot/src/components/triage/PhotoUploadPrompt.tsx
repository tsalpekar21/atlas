"use client";

import React from "react";
import { Button } from "@atlas/subframe/components/Button";
import { FeatherCamera, FeatherInfo } from "@subframe/core";

interface PhotoUploadPromptProps {
  onUpload: (files: FileList) => void;
}

export function PhotoUploadPrompt({ onUpload }: PhotoUploadPromptProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <>
      <div className="flex w-full items-center gap-2 rounded-md border border-solid border-brand-200 bg-brand-50 px-3 py-2">
        <FeatherInfo className="text-body font-body text-brand-700" />
        <span className="text-caption font-caption text-brand-700">
          Photos help us prioritize urgent cases and prepare for your visit
        </span>
      </div>
      <Button
        variant="brand-secondary"
        size="medium"
        icon={<FeatherCamera />}
        onClick={() => inputRef.current?.click()}
      >
        Upload Photo
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onUpload(e.target.files);
          }
        }}
      />
    </>
  );
}

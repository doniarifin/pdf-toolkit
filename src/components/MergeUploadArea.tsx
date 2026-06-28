import React, { useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFilePdf } from "@fortawesome/free-solid-svg-icons";

interface MergeUploadAreaProps {
  onChange: (files: File[]) => void;
}

const MergeUploadArea: React.FC<MergeUploadAreaProps> = ({ onChange }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    onChange(Array.from(e.target.files));
    e.target.value = "";
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <label className="w-full h-48 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition hover:border-blue-500 hover:bg-blue-50">
      <div className="text-center">
        <FontAwesomeIcon
          icon={faFilePdf}
          size="2x"
          className="text-red-500 mb-2"
        />
        <p className="text-gray-600 font-medium">Click here to upload PDFs</p>
        <p className="text-sm text-gray-400 mt-1">Choose PDF files to merge</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="application/pdf"
        className="hidden"
        onChange={handleFile}
      />
    </label>
  );
};

export default MergeUploadArea;
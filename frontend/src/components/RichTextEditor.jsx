// ✅ 수정된 RichTextEditor.jsx
// 프론트에서 npm install react-quill해야함
import React from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import "./RichTextEditor.css";

export default function RichTextEditor({
  value,
  onChange,
  placeholder, // ⬅ 선택적 (없으면 안적용)
  height = "300px",
  readOnly = false,
}) {
  const modules = {
    toolbar: readOnly
      ? false
      : [
          [{ header: [1, 2, 3, false] }],
          ["bold", "italic", "underline", "strike"],
          [{ list: "ordered" }, { list: "bullet" }],
          ["link", "image", "video"],
          ["clean"],
        ],
  };

  const formats = [
    "header",
    "bold",
    "italic",
    "underline",
    "strike",
    "list",
    "bullet",
    "link",
    "image",
    "video",
  ];

  return (
    <div>
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder || ""} // ✅ 없으면 빈 문자열 → placeholder 미표시
        readOnly={readOnly}
      />
    </div>
  );
}

// /src/features/project_post/RecipeFormInput.jsx
export default function FormInput({
  label,
  name,
  type = "text",
  value,
  onChange,
  required = false,
  min,
  max,
  step = 1,
  disabled = false, // ✅ 추가: 비활성화 옵션 지원
}) {
  return (
    <div style={{ marginBottom: "1rem" }}>
      <label style={{ display: "block", fontWeight: "bold" }}>{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        min={min}
        max={max}
        step={step}
        disabled={disabled} // ✅ 수정 시 true로 전달하면 회색 비활성화
        style={{
          width: "100%",
          padding: "8px",
          backgroundColor: disabled ? "#f0f0f0" : "white", // ✅ 회색 배경
          color: disabled ? "#777" : "black",               // ✅ 글자색 회색
          cursor: disabled ? "not-allowed" : "text",        // ✅ 클릭 불가 커서
        }}
      />
    </div>
  );
}

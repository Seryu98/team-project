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
  step = 1,   // ✅ 기본값을 1로 줌 (정수만 허용)
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
        style={{ width: "100%", padding: "8px" }}
      />
    </div>
  );
}

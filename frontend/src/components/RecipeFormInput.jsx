// frontend/src/components/RecipeFormInput.jsx
export default function FormInput({ label, name, type="text", value, onChange, required=false }) {
  return (
    <div style={{ marginBottom: "1rem" }}>
      <label style={{ display: "block", fontWeight: "bold" }}>{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        style={{ width: "100%", padding: "8px" }}
      />
    </div>
  );
}
// src/pages/ApplicationsPage.jsx
import ApplicationForm from "../components/applications/ApplicationForm";
import ApplicationList from "../components/applications/ApplicationList";

export default function ApplicationsPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">지원 관리</h1>
      <ApplicationForm />
      <ApplicationList />
    </div>
  );
}

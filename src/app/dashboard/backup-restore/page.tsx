import { BackupDashboard } from "@/src/components/backup/BackupDashboard";
import { RestoreWizard } from "@/src/components/backup/RestoreWizard";

export default function BackupRestorePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 py-8">
      <div>
        <h1 className="text-2xl font-bold text-neutral-100">
          Backup & Restore
        </h1>
        <p className="mt-1 text-sm text-neutral-400">
          Create, download, and restore IndexedDB backups. Backup data includes
          inspection records, node configuration snapshots, sync queue entries,
          and Horizon cursor caches.
        </p>
      </div>

      <BackupDashboard />

      <div>
        <h2 className="mb-4 text-lg font-semibold text-neutral-100">
          Restore from File
        </h2>
        <RestoreWizard />
      </div>
    </div>
  );
}

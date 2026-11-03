import { useState, type ChangeEvent, CSSProperties, Dispatch, FormEvent, SetStateAction } from "react";
import UserAccessCard from "./UserAccessCard";
import type { BillingSettings } from "./types";
import { formatBuildDate, formatDeploymentInfo, type VersionInfo } from "./version";

interface ThemePreset {
  name: string;
  background: string;
  text: string;
  input: string;
  accent: string;
  accentText: string;
}

interface DefaultTheme {
  adminBackgroundColor: string;
  adminTextColor: string;
  siteInputColor: string;
  siteAccentColor: string;
  siteAccentTextColor: string;
}

interface AdminPageProps {
  isSuperAdmin: boolean;
  adminTextColor: string;
  adminSectionStyle: CSSProperties;
  adminCardStyle: CSSProperties;
  adminMutedTextStyle: CSSProperties;
  quickThemePresets: ThemePreset[];
  setBillingSettings: Dispatch<SetStateAction<BillingSettings>>;
  adminBackgroundColor: string;
  siteInputColor: string;
  siteAccentColor: string;
  siteAccentTextColor: string;
  defaultTheme: DefaultTheme;
  saveBilling: (event: FormEvent) => Promise<void>;
  savingBilling: boolean;
  selectedBackupSections: string[];
  setSelectedBackupSections: Dispatch<SetStateAction<string[]>>;
  toggleBackupSection: (section: string) => void;
  downloadSelectedBackup: () => Promise<void>;
  restoreSelectedBackup: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  backupMessage: string;
  workspaceId: string;
  versionInfo: VersionInfo | null;
  versionError: string;
}

export default function AdminPage({
  isSuperAdmin,
  adminTextColor,
  adminSectionStyle,
  adminCardStyle,
  adminMutedTextStyle,
  quickThemePresets,
  setBillingSettings,
  adminBackgroundColor,
  siteInputColor,
  siteAccentColor,
  siteAccentTextColor,
  defaultTheme,
  saveBilling,
  savingBilling,
  selectedBackupSections,
  setSelectedBackupSections,
  toggleBackupSection,
  downloadSelectedBackup,
  restoreSelectedBackup,
  backupMessage,
  workspaceId,
  versionInfo,
  versionError,
}: AdminPageProps) {
  const [copyMessage, setCopyMessage] = useState("");

  const copySupportInfo = async () => {
    if (!versionInfo) return;
    try {
      await navigator.clipboard.writeText(`${formatDeploymentInfo(versionInfo)}\nWorkspace ID: ${workspaceId}`);
      setCopyMessage("Support information copied to clipboard.");
    } catch {
      setCopyMessage("Copy failed. Select the details and copy them manually.");
    }
  };

  const supportRows: [string, string][] = [
    ["Workspace ID", workspaceId],
    ...(versionInfo
      ? ([
          ["Version", versionInfo.version],
          ["Build number", versionInfo.buildNumber],
          ["Git commit", versionInfo.gitCommit && versionInfo.gitCommit !== "unknown" ? versionInfo.gitCommit : "Not available"],
          ["Branch", versionInfo.gitBranch],
          ["Built", formatBuildDate(versionInfo.buildDate)],
          ["Environment", versionInfo.environment],
        ] as [string, string][])
      : []),
  ];

  return (
    <div className="space-y-6" style={{ color: adminTextColor }}>
      {isSuperAdmin ? <UserAccessCard /> : null}
      <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6" style={adminSectionStyle}>
        <h2 className="text-xl font-semibold">Admin backup & data tools</h2>
        <p className="mt-2 text-sm text-slate-400" style={adminMutedTextStyle}>Export jobs, materials, and the full app data snapshot, then restore them later if needed.</p>

        <div className="mt-6 rounded-2xl border border-slate-800 p-4" style={adminCardStyle}>
          <h3 className="text-sm font-semibold" style={{ color: adminTextColor }}>Site theme colours</h3>
          <p className="mt-2 text-xs" style={adminMutedTextStyle}>Set custom background and text colours for the whole app to match your business colour scheme.</p>
          <div className="mt-4">
            <p className="text-xs" style={adminMutedTextStyle}>Quick presets</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {quickThemePresets.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => setBillingSettings((current) => ({
                    ...current,
                    adminBackgroundColor: preset.background,
                    adminTextColor: preset.text,
                    siteInputColor: preset.input,
                    siteAccentColor: preset.accent,
                    siteAccentTextColor: preset.accentText,
                  }))}
                  className="rounded-2xl border border-slate-700 px-3 py-2 text-left text-xs"
                  title={`Apply ${preset.name} preset`}
                >
                  <span className="block font-semibold" style={{ color: adminTextColor }}>{preset.name}</span>
                  <span className="mt-1 flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full border border-slate-600" style={{ backgroundColor: preset.background }} title="Background" />
                    <span className="h-3 w-3 rounded-full border border-slate-600" style={{ backgroundColor: preset.text }} title="Text" />
                    <span className="h-3 w-3 rounded-full border border-slate-600" style={{ backgroundColor: preset.input }} title="Input" />
                    <span className="h-3 w-3 rounded-full border border-slate-600" style={{ backgroundColor: preset.accent }} title="Accent" />
                    <span className="h-3 w-3 rounded-full border border-slate-600" style={{ backgroundColor: preset.accentText }} title="Accent text" />
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm">
              <span className="shrink-0">Site background</span>
              <span className="flex items-center gap-2">
              <input
                type="color"
                value={adminBackgroundColor}
                onChange={(e) => setBillingSettings((current) => ({ ...current, adminBackgroundColor: e.target.value }))}
                className="h-10 w-14 cursor-pointer rounded-lg border border-slate-700 bg-transparent"
              />
              <input
                value={adminBackgroundColor}
                onChange={(e) => setBillingSettings((current) => ({ ...current, adminBackgroundColor: e.target.value }))}
                className="w-28 rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2"
                placeholder="#0f172a"
              />
              </span>
            </label>
            <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm">
              <span className="shrink-0">Site text</span>
              <span className="flex items-center gap-2">
              <input
                type="color"
                value={adminTextColor}
                onChange={(e) => setBillingSettings((current) => ({ ...current, adminTextColor: e.target.value }))}
                className="h-10 w-14 cursor-pointer rounded-lg border border-slate-700 bg-transparent"
              />
              <input
                value={adminTextColor}
                onChange={(e) => setBillingSettings((current) => ({ ...current, adminTextColor: e.target.value }))}
                className="w-28 rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2"
                placeholder="#e2e8f0"
              />
              </span>
            </label>
            <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm">
              <span className="shrink-0">Search and input</span>
              <span className="flex items-center gap-2">
              <input
                type="color"
                value={siteInputColor}
                onChange={(e) => setBillingSettings((current) => ({ ...current, siteInputColor: e.target.value }))}
                className="h-10 w-14 cursor-pointer rounded-lg border border-slate-700 bg-transparent"
              />
              <input
                value={siteInputColor}
                onChange={(e) => setBillingSettings((current) => ({ ...current, siteInputColor: e.target.value }))}
                className="w-28 rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2"
                placeholder="#111827"
              />
              </span>
            </label>
            <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm">
              <span className="shrink-0">Accent button</span>
              <span className="flex items-center gap-2">
              <input
                type="color"
                value={siteAccentColor}
                onChange={(e) => setBillingSettings((current) => ({ ...current, siteAccentColor: e.target.value }))}
                className="h-10 w-14 cursor-pointer rounded-lg border border-slate-700 bg-transparent"
              />
              <input
                value={siteAccentColor}
                onChange={(e) => setBillingSettings((current) => ({ ...current, siteAccentColor: e.target.value }))}
                className="w-28 rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2"
                placeholder="#22d3ee"
              />
              </span>
            </label>
            <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm">
              <span className="shrink-0">Accent button text</span>
              <span className="flex items-center gap-2">
              <input
                type="color"
                value={siteAccentTextColor}
                onChange={(e) => setBillingSettings((current) => ({ ...current, siteAccentTextColor: e.target.value }))}
                className="h-10 w-14 cursor-pointer rounded-lg border border-slate-700 bg-transparent"
              />
              <input
                value={siteAccentTextColor}
                onChange={(e) => setBillingSettings((current) => ({ ...current, siteAccentTextColor: e.target.value }))}
                className="w-28 rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2"
                placeholder="#E5E5E7"
              />
              </span>
            </label>
            <div className="rounded-xl border border-slate-700 p-3" style={{ backgroundColor: siteInputColor }}>
              <p className="text-xs" style={adminMutedTextStyle}>Accent preview</p>
              <button type="button" className="mt-2 rounded-full px-4 py-2 text-sm" style={{ backgroundColor: siteAccentColor, color: siteAccentTextColor }}>Example action button</button>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setBillingSettings((current) => ({
                ...current,
                adminBackgroundColor: defaultTheme.adminBackgroundColor,
                adminTextColor: defaultTheme.adminTextColor,
                siteInputColor: defaultTheme.siteInputColor,
                siteAccentColor: defaultTheme.siteAccentColor,
                siteAccentTextColor: defaultTheme.siteAccentTextColor,
              }))}
              className="rounded-full border border-slate-600 px-4 py-2 text-sm"
            >
              Reset colors
            </button>
            <button
              type="button"
              onClick={() => saveBilling({ preventDefault: () => undefined } as FormEvent)}
              className="rounded-full border border-cyan-700 px-4 py-2 text-sm text-cyan-300"
            >
              {savingBilling ? "Saving..." : "Save site theme"}
            </button>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-4" style={adminCardStyle}>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: adminTextColor }}>Backup and restore</h3>
            <p className="mt-1 text-xs" style={adminMutedTextStyle}>Choose the sections to include in one backup file. Workshop jobs, materials and equipment stay together so their links can be restored safely.</p>
          </div>

          <fieldset className="mt-4">
            <legend className="mb-2 text-sm font-medium" style={{ color: adminTextColor }}>Include in backup</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                ["workshop", "Workshop jobs, materials and equipment"],
                ["customers", "Customers"],
                ["suppliers", "Suppliers and purchase history"],
                ["billing", "Billing and theme settings"],
              ].map(([key, label]) => (
                <label key={key} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm text-slate-200">
                  <input type="checkbox" checked={selectedBackupSections.includes(key)} onChange={() => toggleBackupSection(key)} className="h-4 w-4 accent-blue-500" />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => setSelectedBackupSections(["workshop", "customers", "suppliers", "billing"])} className="rounded-full border border-slate-600 px-3 py-1.5 text-xs">Select all</button>
              <button type="button" onClick={() => setSelectedBackupSections([])} className="rounded-full border border-slate-600 px-3 py-1.5 text-xs">Clear selection</button>
            </div>
          </fieldset>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="button" onClick={downloadSelectedBackup} disabled={!selectedBackupSections.length} className="rounded-full border border-cyan-700 px-4 py-2 text-sm text-cyan-300 disabled:cursor-not-allowed disabled:opacity-50">Download selected backup</button>
            <label className="cursor-pointer rounded-full border border-cyan-700 px-4 py-2 text-sm text-cyan-300">
              <span>Restore from backup file</span>
              <input type="file" accept=".json,.csv,application/json,text/csv" className="hidden" onChange={restoreSelectedBackup} />
            </label>
          </div>
          <p className="mt-3 text-xs" style={adminMutedTextStyle}>A MakerFlow selected backup replaces only the sections saved in that file. Older full and individual JSON backups, plus jobs and materials CSV backups, are also supported. Full backup restores replace all current app data.</p>
          {backupMessage ? <p role="status" className="mt-4 text-sm text-cyan-300">{backupMessage}</p> : null}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6" style={adminSectionStyle}>
        <h2 className="text-xl font-semibold">Support information</h2>
        <p className="mt-2 text-sm text-slate-400" style={adminMutedTextStyle}>Quote these details when contacting support.</p>
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          {supportRows.map(([label, value]) => (
            <div key={label} className="contents">
              <dt style={adminMutedTextStyle}>{label}</dt>
              <dd className="select-all break-all font-mono text-xs">{value}</dd>
            </div>
          ))}
        </dl>
        {!versionInfo ? <p className="mt-2 text-xs" style={adminMutedTextStyle}>{versionError || "Loading version information..."}</p> : null}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => void copySupportInfo()} disabled={!versionInfo} className="rounded-full border border-cyan-700 px-4 py-2 text-sm text-cyan-300 disabled:cursor-not-allowed disabled:opacity-50">Copy support information</button>
          {copyMessage ? <span role="status" className="text-xs">{copyMessage}</span> : null}
        </div>
      </section>
    </div>
  );
}

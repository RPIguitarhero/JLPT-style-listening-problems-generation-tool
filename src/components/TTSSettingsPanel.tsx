import React, { useState, useEffect } from "react";
import {
  TTSProvider,
  VoicevoxSettings,
  getStoredTTSProvider,
  setStoredTTSProvider,
  getStoredVoicevoxSettings,
  setStoredVoicevoxSettings,
  testVoicevoxConnection,
  fetchVoicevoxSpeakers,
  VoicevoxStyleDescription,
  FALLBACK_VOICEVOX_STYLES
} from "../lib/ttsService";
import { useTranslation } from "../lib/translations";
import { Sliders, Radio, Globe, Wifi, WifiOff, RefreshCw, Layers } from "lucide-react";

interface TTSSettingsPanelProps {
  onProviderChanged?: (provider: TTSProvider) => void;
  onSettingsChanged?: (settings: VoicevoxSettings) => void;
}

export default function TTSSettingsPanel({
  onProviderChanged,
  onSettingsChanged
}: TTSSettingsPanelProps) {
  const { t } = useTranslation();
  const [provider, setProvider] = useState<TTSProvider>("google");
  const [settings, setSettings] = useState<VoicevoxSettings>(getStoredVoicevoxSettings());
  const [connectionStatus, setConnectionStatus] = useState<"unchecked" | "checking" | "connected" | "unreachable">("unchecked");
  const [voicevoxVersion, setVoicevoxVersion] = useState<string>("");
  const [speakersList, setSpeakersList] = useState<VoicevoxStyleDescription[]>(FALLBACK_VOICEVOX_STYLES);
  const [connErrorMsg, setConnErrorMsg] = useState<string | null>(null);

  // Sync settings at boot
  useEffect(() => {
    const activeProvider = getStoredTTSProvider();
    const activeSettings = getStoredVoicevoxSettings();
    setProvider(activeProvider);
    setSettings(activeSettings);

    // Run connection test and load speakers if voicevox is preferred
    triggerConnectionTest(activeSettings.baseUrl);
    loadVoicevoxSpeakers(activeSettings.baseUrl);
  }, []);

  const handleProviderToggle = (p: TTSProvider) => {
    setProvider(p);
    setStoredTTSProvider(p);
    if (onProviderChanged) {
      onProviderChanged(p);
    }
  };

  const updateSetting = <K extends keyof VoicevoxSettings>(key: K, value: VoicevoxSettings[K]) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    setStoredVoicevoxSettings(updated);
    if (onSettingsChanged) {
      onSettingsChanged(updated);
    }
  };

  const updateSpeakerRole = (role: "Narrator" | "Man" | "Woman", id: number) => {
    const updatedSpeakerMap = { ...settings.speakerMap, [role]: id };
    const updated = { ...settings, speakerMap: updatedSpeakerMap };
    setSettings(updated);
    setStoredVoicevoxSettings(updated);
    if (onSettingsChanged) {
      onSettingsChanged(updated);
    }
  };

  const triggerConnectionTest = async (url: string) => {
    setConnectionStatus("checking");
    setConnErrorMsg(null);
    try {
      const ver = await testVoicevoxConnection(url);
      setConnectionStatus("connected");
      setVoicevoxVersion(ver);
    } catch (err: any) {
      setConnectionStatus("unreachable");
      setConnErrorMsg(err.message || "Could not connect.");
    }
  };

  const loadVoicevoxSpeakers = async (url: string) => {
    const list = await fetchVoicevoxSpeakers(url);
    if (list && list.length > 0) {
      setSpeakersList(list);
    }
  };

  const handleRetest = () => {
    triggerConnectionTest(settings.baseUrl);
    loadVoicevoxSpeakers(settings.baseUrl);
  };

  return (
    <div id="tts-provider-settings" className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm flex flex-col gap-5">
      {/* Set Header titles */}
      <div className="flex flex-col gap-1 border-b border-slate-100 pb-3">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 font-display">
          <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded">🎛️</span>
          {t("tts_settings_title")}
        </h3>
        <p className="text-xs text-slate-500 leading-normal">
          {t("tts_settings_desc")}
        </p>
      </div>

      {/* Selector Choices */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => handleProviderToggle("google")}
          className={`flex flex-col gap-2 p-3.5 rounded-2xl border text-left transition ${
            provider === "google"
              ? "bg-indigo-50/50 border-indigo-400 ring-1 ring-indigo-400/10"
              : "border-slate-200 hover:bg-slate-50/50"
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-bold text-slate-800">{t("google_tts")}</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <span className="text-[11px] text-slate-400 leading-normal">
            {t("google_tts_desc")}
          </span>
        </button>

        <button
          onClick={() => handleProviderToggle("voicevox")}
          className={`flex flex-col gap-2 p-3.5 rounded-2xl border text-left transition ${
            provider === "voicevox"
              ? "bg-indigo-50/50 border-indigo-400 ring-1 ring-indigo-400/10"
              : "border-slate-200 hover:bg-slate-50/50"
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-bold text-slate-800">{t("local_voicevox")}</span>
            <div className={`w-2.5 h-2.5 rounded-full ${connectionStatus === "connected" ? "bg-emerald-500" : "bg-rose-500 animate-ping"}`} />
          </div>
          <span className="text-[11px] text-slate-400 leading-normal">
            {t("local_voicevox_desc")}
          </span>
        </button>
      </div>

      {/* Google settings card info */}
      {provider === "google" && (
        <div className="p-3.5 bg-slate-50 border border-slate-150 rounded-xl text-xs text-slate-500 leading-relaxed flex items-start gap-2.5">
          <Globe size={16} className="text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-slate-700">{t("cloud_active_title")}</p>
            <p className="mt-0.5 text-[11px]">
              {t("cloud_active_desc")}
            </p>
          </div>
        </div>
      )}

      {/* VOICEVOX settings form inputs */}
      {provider === "voicevox" && (
        <div className="flex flex-col gap-4.5 border-t border-slate-100 pt-4.5 fade-in">
          
          {/* VOICEVOX network status ribbon */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
            <div className="flex items-center gap-2.5">
              {connectionStatus === "connected" ? (
                <Wifi size={16} className="text-emerald-500" />
              ) : (
                <WifiOff size={16} className="text-rose-500" />
              )}
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-850">
                  {connectionStatus === "checking" && t("conn_interrogating")}
                  {connectionStatus === "connected" && `${t("conn_connected")} (VOICEVOX v${voicevoxVersion})`}
                  {connectionStatus === "unreachable" && t("conn_offline")}
                  {connectionStatus === "unchecked" && t("conn_unchecked")}
                </span>
                <span className="text-[10px] text-slate-450 mt-0.5 font-mono">
                  Host: {settings.baseUrl}
                </span>
              </div>
            </div>

            <button
              onClick={handleRetest}
              disabled={connectionStatus === "checking"}
              className="px-3.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <RefreshCw size={12} className={connectionStatus === "checking" ? "animate-spin" : ""} />
              <span>{t("btn_test_conn")}</span>
            </button>
          </div>

          {/* Connection offline alert notice to abide by requirements */}
          {connectionStatus === "unreachable" && (
            <div className="p-3.5 bg-rose-50/70 border border-rose-200 text-rose-700 rounded-2xl text-xs leading-relaxed">
              <p className="font-bold">{t("err_unreachable_title")}</p>
              <p className="mt-0.5 text-[11px]">
                {t("err_unreachable_desc")} <code>{settings.baseUrl}</code>.
              </p>
              <p className="mt-2 text-[10px] font-mono p-1 bg-rose-950/20 rounded">
                docker run --rm -it -p 50021:50021 voicevox/voicevox_engine:cpu-ubuntu-latest
              </p>
            </div>
          )}

          {/* End-point input setup */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
              {t("endpoint_label")}
            </label>
            <input
              type="text"
              value={settings.baseUrl}
              onChange={(e) => updateSetting("baseUrl", e.target.value)}
              placeholder="e.g. http://127.0.0.1:50021"
              className="w-full text-xs font-mono font-semibold p-2.5 rounded-xl border border-slate-200 bg-white"
            />
          </div>

          {/* Speaker Roles Configuration map */}
          <div className="flex flex-col gap-2.5">
            <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase flex items-center gap-1">
              <Layers size={11} />
              {t("role_mapping_title")}
            </span>

            <div className="grid grid-cols-1 gap-2.5">
              {/* Narrator Voice */}
              <div className="flex items-center justify-between gap-3 p-3 bg-white border border-blue-100 rounded-2xl shadow-2xs">
                <div className="flex flex-col gap-0.5 shrink-0 max-w-[100px]">
                  <span className="text-xs font-bold text-slate-700">{t("narrator_role")}</span>
                  <span className="text-[10px] text-slate-400 font-mono">ナレーター</span>
                </div>
                <select
                  value={settings.speakerMap.Narrator}
                  onChange={(e) => updateSpeakerRole("Narrator", parseInt(e.target.value))}
                  className="text-xs font-semibold p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none flex-1 max-w-[280px]"
                >
                  {speakersList.map((sp) => (
                    <option key={`narrator-${sp.styleId}`} value={sp.styleId}>
                      {sp.speakerName} ({sp.styleName}) [ID {sp.styleId}]
                    </option>
                  ))}
                </select>
              </div>

              {/* Man Voice */}
              <div className="flex items-center justify-between gap-3 p-3 bg-white border border-blue-100 rounded-2xl shadow-2xs">
                <div className="flex flex-col gap-0.5 shrink-0 max-w-[100px]">
                  <span className="text-xs font-bold text-slate-700">{t("man_role")}</span>
                  <span className="text-[10px] text-slate-400 font-mono">男の人</span>
                </div>
                <select
                  value={settings.speakerMap.Man}
                  onChange={(e) => updateSpeakerRole("Man", parseInt(e.target.value))}
                  className="text-xs font-semibold p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none flex-1 max-w-[280px]"
                >
                  {speakersList.map((sp) => (
                    <option key={`man-${sp.styleId}`} value={sp.styleId}>
                      {sp.speakerName} ({sp.styleName}) [ID {sp.styleId}]
                    </option>
                  ))}
                </select>
              </div>

              {/* Woman Voice */}
              <div className="flex items-center justify-between gap-3 p-3 bg-white border border-pink-100 rounded-2xl shadow-2xs">
                <div className="flex flex-col gap-0.5 shrink-0 max-w-[100px]">
                  <span className="text-xs font-bold text-slate-700">{t("woman_role")}</span>
                  <span className="text-[10px] text-slate-400 font-mono">女の人</span>
                </div>
                <select
                  value={settings.speakerMap.Woman}
                  onChange={(e) => updateSpeakerRole("Woman", parseInt(e.target.value))}
                  className="text-xs font-semibold p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none flex-1 max-w-[280px]"
                >
                  {speakersList.map((sp) => (
                    <option key={`woman-${sp.styleId}`} value={sp.styleId}>
                      {sp.speakerName} ({sp.styleName}) [ID {sp.styleId}]
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Sliders scales tuning options */}
          <div className="flex flex-col gap-3.5 border-t border-slate-100 pt-3">
            <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase flex items-center gap-1">
              <Sliders size={11} />
              {t("tuning_params_title")}
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50/50 p-4 border border-slate-100 rounded-2xl">
              {/* speedScale */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-slate-600">{t("speed_label")}</span>
                  <span className="text-[10px] font-mono font-bold text-indigo-600">{settings.speedScale.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.05"
                  value={settings.speedScale}
                  onChange={(e) => updateSetting("speedScale", parseFloat(e.target.value))}
                  className="w-full cursor-pointer"
                />
              </div>

              {/* pitchScale */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-slate-600">{t("pitch_label")}</span>
                  <span className="text-[10px] font-mono font-bold text-indigo-600">{settings.pitchScale >= 0 ? "+" : ""}{settings.pitchScale.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="-0.15"
                  max="0.15"
                  step="0.01"
                  value={settings.pitchScale}
                  onChange={(e) => updateSetting("pitchScale", parseFloat(e.target.value))}
                  className="w-full cursor-pointer"
                />
              </div>

              {/* intonationScale */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-slate-600">{t("intonation_label")}</span>
                  <span className="text-[10px] font-mono font-bold text-indigo-600">{settings.intonationScale.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="2.0"
                  step="0.05"
                  value={settings.intonationScale}
                  onChange={(e) => updateSetting("intonationScale", parseFloat(e.target.value))}
                  className="w-full cursor-pointer"
                />
              </div>

              {/* volumeScale */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-slate-600">{t("volume_label")}</span>
                  <span className="text-[10px] font-mono font-bold text-indigo-600">{settings.volumeScale.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.5"
                  step="0.05"
                  value={settings.volumeScale}
                  onChange={(e) => updateSetting("volumeScale", parseFloat(e.target.value))}
                  className="w-full cursor-pointer"
                />
              </div>

              {/* prePhonemeLength */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-600">
                  {t("pre_phoneme_label")}
                </label>
                <input
                  type="number"
                  min="0.0"
                  max="1.5"
                  step="0.05"
                  value={settings.prePhonemeLength ?? ""}
                  onChange={(e) => {
                    const val = e.target.value === "" ? undefined : parseFloat(e.target.value);
                    updateSetting("prePhonemeLength", val);
                  }}
                  className="text-xs p-1.5 border border-slate-200 bg-white rounded-lg focus:outline-none"
                  placeholder="e.g. 0.1 (optional)"
                />
              </div>

              {/* postPhonemeLength */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-600">
                  {t("post_phoneme_label")}
                </label>
                <input
                  type="number"
                  min="0.0"
                  max="1.5"
                  step="0.05"
                  value={settings.postPhonemeLength ?? ""}
                  onChange={(e) => {
                    const val = e.target.value === "" ? undefined : parseFloat(e.target.value);
                    updateSetting("postPhonemeLength", val);
                  }}
                  className="text-xs p-1.5 border border-slate-200 bg-white rounded-lg focus:outline-none"
                  placeholder="e.g. 0.1 (optional)"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

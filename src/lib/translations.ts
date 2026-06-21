import { useState, useEffect } from "react";

export type Language = "en" | "zh";

// Simple reactive state hook for zero-dependency reactive i18n
let currentLanguage: Language = "en";
try {
  const saved = localStorage.getItem("app-lang");
  if (saved === "zh" || saved === "en") {
    currentLanguage = saved;
  }
} catch (_) {}

const listeners = new Set<(lang: Language) => void>();

export function getLanguage(): Language {
  return currentLanguage;
}

export function setLanguage(lang: Language) {
  currentLanguage = lang;
  try {
    localStorage.setItem("app-lang", lang);
  } catch (_) {}
  listeners.forEach((cb) => cb(lang));
}

export const translations = {
  en: {
    // Header & Global App elements
    app_title: "日本語 JLPT Listening Practice & TTS Studio",
    app_subtitle: "Standard exam presets, AI listening generator, and multi-speaker Japanese synthesis",
    listening_tab: "Listening Practice",
    custom_tab: "Custom Script Studio",
    upload_tab: "Upload Text for TTS",
    dark_name: "Dark Mode",
    light_name: "Light Mode",
    lang_select: "Language",

    // TTSSettingsPanel
    tts_settings_title: "Unified Japanese TTS Settings",
    tts_settings_desc: "Toggle between default Gemini-TTS and local, network-isolated VOICEVOX synthesize modules.",
    google_tts: "1. Google TTS (Cloud)",
    google_tts_desc: "Uses cloud Gemini-3.1 engine to produce natural multi-speaker conversations. Requires server connection.",
    local_voicevox: "2. Local VOICEVOX",
    local_voicevox_desc: "Synthesizes Japanese audio local-first using Docker VOICEVOX on port 50021. 100% confidential.",
    cloud_active_title: "Cloud Practice Mode Active",
    cloud_active_desc: "Preset scenarios, dynamic generator results, and screenplay creators leverage prebuilt \"Fenrir\" (Male) and \"Kore\" (Female) voices natively in high fidelity.",
    conn_interrogating: "Interrogating VOICEVOX...",
    conn_connected: "Connected",
    conn_offline: "VOICEVOX Offline / Unreachable",
    conn_unchecked: "Unchecked Connection Status",
    btn_test_conn: "Test Connection",
    err_unreachable_title: "VOICEVOX Engine is not reachable",
    err_unreachable_desc: "Please start Docker Desktop and execute the local VOICEVOX container listening at:",
    endpoint_label: "VOICEVOX Base Engine Endpoint",
    role_mapping_title: "Speaker Role Voice Mapping",
    narrator_role: "Narrator role",
    man_role: "Man role",
    woman_role: "Woman role",
    tuning_params_title: "VOICEVOX Audio Tuning Scale Parameters",
    speed_label: "Speed (速度)",
    pitch_label: "Pitch (音高)",
    intonation_label: "Intonation (抑揚)",
    volume_label: "Volume (音量)",
    pre_phoneme_label: "Pre-Phoneme Length (開始の無音秒数)",
    post_phoneme_label: "Post-Phoneme Length (終了の無音秒数)",

    // AudioPlayerSection (Listening Player & Vocab & Quiz)
    generate_mp3_btn: "Generate Audio",
    synthesizing_btn: "Synthesizing...",
    no_audio_yet: "No Audio Generated Yet",
    auto_synth_hint: "Click to synthesize audio with Japanese Voices",
    download_mp3_btn: "Download MP3",
    materials_preset_title: "Exam List Preset Scenarios",
    materials_preset_desc: "Hand-crafted JLPT situations with transcript, translations, vocabulary and dynamic option drills to train your ears.",
    vocab_master_title: "Scenario Key Vocabulary",
    vocab_master_desc: "Master essential definitions and pronunciations for this scenario.",
    correct_unlocked: "Correct explanation unlocked!",
    explanation_label: "Explanation:",
    quiz_section_title: "Listening Comprehension Drill",
    submit_response_btn: "Submit Answer",
    try_again_label: "Try Another Option",
    your_answer_correct: "Correct! Your answer is absolutely correct.",
    your_answer_incorrect: "Incorrect. Listen to the tape and read the situation scripts carefully, then retry.",

    // ScriptCreator (Multi-Speaker DIY)
    diy_studio_title: "Multi-Speaker DIY Script Writer",
    diy_studio_desc: "Write your own Japanese screenplay dialogue. Assign different speaker characters (Narrator, Man, Woman) to compile a multi-speaker audio wave recording.",
    script_title_label: "Script Track General Title",
    script_lvl_label: "Associated Exam Level Indicator",
    dialogue_timeline: "Dialogue Script Timeline Composer",
    tbl_row_speaker: "Speaker",
    tbl_row_japanese: "Japanese Audio Text",
    tbl_row_english: "English Translation Translation",
    add_timeline_row_btn: "Add New Conversation Line",
    compile_preview_btn: "Compile & Preview Dialogue",
    narrator_opt: "Narrator",
    man_opt: "Man",
    woman_opt: "Woman",

    // GeneratorSection (AI custom practice)
    ai_generator_title: "AI Practice Generator",
    ai_generator_desc: "Let Gemini write an entire custom JLPT test item! Pick your level and context theme, and watch the AI craft questions, options, scripts, and vocabulary.",
    target_jlpt_label: "Target JLPT Standard",
    scenario_hint_label: "Scenario Context Theme Hint",
    scenario_placeholder: "e.g. coffee ordering, losing keys, train delay...",
    recommend_themes: "Recommended Quick Context Ideas",
    generate_drills_btn: "Generate Scenario & Drills",

    // TxtUploaderTTS
    large_upload_workspace: "Large-scale Text Uploader Japanese TTS Workspace",
    uploader_desc: "Provide large text blocks or drag *.txt files. Our tokenizer partitions large scripts cleanly by structural Japanese stops into safe interactive play cards with separate wave download streams.",
    paste_placeholder: "Paste Japanese text here...",
    drag_drop_click: "Drag and drop standard text files (*.txt) or click to browse",
    supported_files: "Supported file formats: UTF-8 plain text documents",
    parse_words_btn: "Run Segment Tokenizer",
    clear_workspace: "Clear Workspace",
    quick_stats: "Input Statistics",
    stats_chars: "Total Characters:",
    stats_segments: "Discovered Segments:",
    text_segment_list: "Structural Segment Timeline Downloader",
    segment_card: "Segment #",
    play_btn: "Play",
    pause_btn: "Pause",
    download_btn: "Download",
    gen_tts_btn: "Generate Audio",
    action_batch_download: "Compile & Export ZIP Archive",
    exporting_zip: "Packaging MP3s into ZIP file...",
    
    // TxtUploaderTTS additions
    drag_drop_title: "Drag & drop your text script here",
    supported_files_desc: "Supports .txt, .json, and .xml files containing plain dialogues, segments, or structural screenplay scripts.",
    browse_files_btn: "Browse Files",
    estimating_lvl: "Estimating...",
    level_label: "Level",
    download_mp3_txt: "Download MP3",
    synthesizing_txt: "Synthesizing...",
    generate_speech_txt: "Generate Speech",
    no_audio_found: "No Speech Audio Found for this Segment",
    click_gen_speech_hint: "Click \"Generate Speech\" to synthesize the segment audio using high quality voices",
    speed_txt: "Speed",
    script_details_txt: "Script Details",
    lines_suffix_txt: "line(s)",
    hide_script_txt: "Hide Script",
    show_script_txt: "Show Script",
    script_hidden_txt: "Script Text Hidden",
    script_hidden_desc: "Listen to the generated voices first before showing the text to test your comprehension!",
    click_show_script_btn: "Click to Show Script",
    ai_comprehension_insight: "AI Reading Comprehension Insight",
    summary_topic_overview: "Summary & Topic Overview",
    key_vocab_words: "Key Vocabulary Words",
    uploaded_document_txt: "Uploaded Document",
    unload_btn: "Unload",
    playback_segments_title: "Playback Segments",
    audio_ready_txt: "Audio Ready",
    synthesize_all_btn: "Synthesize All",
    zip_btn: "ZIP"
  },
  zh: {
    // Header & Global App elements
    app_title: "日本語 JLPT 听力练习与 TTS 工作室",
    app_subtitle: "标准 JLPT 考试预设、AI 听力材料生成器和多角色日语语音合成",
    listening_tab: "听力练习",
    custom_tab: "自定义脚本单间",
    upload_tab: "上传文本转语音",
    dark_name: "夜间阅读模式",
    light_name: "日常明亮模式",
    lang_select: "界面语言",

    // TTSSettingsPanel
    tts_settings_title: "统一日语语音合成设置",
    tts_settings_desc: "在标准 Gemini 云端语音与本地离线隔离的 VOICEVOX 容器合成模块之间进行无缝切换。",
    google_tts: "1. Google TTS (云端高抗压)",
    google_tts_desc: "利用云端 Gemini 3.1 引擎来生成高度逼真的多角色情景对话。需要互联网连接。",
    local_voicevox: "2. 本地离线 VOICEVOX",
    local_voicevox_desc: "100% 局域网离线隐私安全，调用本地运行在 50021 端口的 Docker VOICEVOX 容器。",
    cloud_active_title: "云端练习模式已启用",
    cloud_active_desc: "预设场景、AI 智能生成结果及脚本创作者均默认调用高保真「Fenrir」(男性) 与「Kore」(女性) 日语自然声线。",
    conn_interrogating: "正在探测 VOICEVOX 容器端口...",
    conn_connected: "连接成功",
    conn_offline: "VOICEVOX 未启动或无法连接",
    conn_unchecked: "未检测连接状态",
    btn_test_conn: "测试连接状态",
    err_unreachable_title: "本地 VOICEVOX 引擎无法访问",
    err_unreachable_desc: "请确保已在本地开启 Docker Desktop 并运行以下 VOICEVOX 语音引擎容器:",
    endpoint_label: "VOICEVOX 引擎本地访问地址 (Endpoint)",
    role_mapping_title: "角色生线(Voice)自定义分配映射",
    narrator_role: "旁白角色声线",
    man_role: "男性角色声线",
    woman_role: "女性角色声线",
    tuning_params_title: "VOICEVOX 音量微调及语段参数控制",
    speed_label: "语速缩放倍率 (Speed)",
    pitch_label: "音高峰度增益 (Pitch)",
    intonation_label: "抑扬顿挫起伏 (Intonation)",
    volume_label: "语音振幅音量 (Volume)",
    pre_phoneme_label: "句前留白静音秒数 (Pre-Phoneme)",
    post_phoneme_label: "句后留白静音秒数 (Post-Phoneme)",

    // AudioPlayerSection (Listening Player & Vocab & Quiz)
    generate_mp3_btn: "生成日语配音",
    synthesizing_btn: "语音加速合成中...",
    no_audio_yet: "此栏目尚未生成配音",
    auto_synth_hint: "点击右侧按钮立即合成多角色临场日语录音",
    download_mp3_btn: "下载 MP3 音频",
    materials_preset_title: "精选真题听力预设场景",
    materials_preset_desc: "精雕细琢的真实 JLPT 日常对话，附带原声录音、日汉对照剧本、生词本及交互式单项选择模拟题。",
    vocab_master_title: "对话核心生字词汇背诵",
    vocab_master_desc: "掌握本场景中具有高频复现率的重点词汇、标准汉字及假名释义。",
    correct_unlocked: "模拟精解答案已解锁! 详见下文：",
    explanation_label: "听力精解:",
    quiz_section_title: "真题题型听力多项选择练习",
    submit_response_btn: "递交选项解答",
    try_again_label: "重新选择其他选项",
    your_answer_correct: "回答正确! 您的听力理解完美无缺。",
    your_answer_incorrect: "回答错误。建议对照上述日汉台词剧本多听几遍，重新做出解答。",

    // ScriptCreator (Multi-Speaker DIY)
    diy_studio_title: "多角色日语广播剧 DIY 编剧室",
    diy_studio_desc: "构思专属于您的日语小情景台词。分别为「旁白/旁白」「男主角」「女主角」分发不同声线分配，一键合成完美拼接的多波形高保真波形包。",
    script_title_label: "本篇自定义脚本大标题",
    script_lvl_label: "对应的考试等级指引标识",
    dialogue_timeline: "对话情节剧本多轨时间轴组装",
    tbl_row_speaker: "说话人角色",
    tbl_row_japanese: "日语台词文本",
    tbl_row_english: "英语译文翻译",
    add_timeline_row_btn: "插入新一轮对话台词",
    compile_preview_btn: "一键编译多角色配音并生成交互式播放器",
    narrator_opt: "旁白",
    man_opt: "男主角",
    woman_opt: "女主角",

    // GeneratorSection (AI custom practice)
    ai_generator_title: "AI 智慧听力试题生成器",
    ai_generator_desc: "让谷歌双子座 (Gemini) 模型为您全自动量身定制一整套标准的 JLPT 日语高考/考级原声试卷! 选择您的难度，输入日常主题，见证试题、多选项解答和核心单词本的合成。",
    target_jlpt_label: "学术标准考试等级 (Level)",
    scenario_hint_label: "对话发生的具体生活语境主题",
    scenario_placeholder: "例：便利店买咖啡、护照丢失在检票口、新干线晚点、台风受阻...",
    recommend_themes: "官方高分推荐参考考级主题",
    generate_drills_btn: "立刻生成独家听力试题与配音",

    // TxtUploaderTTS
    large_upload_workspace: "长篇超大文本分词朗读 TTS 工作平台",
    uploader_desc: "粘贴大段日语文本或直接拖入 *.txt 文本文件。我们的分词器支持按句号假名停顿符分段，自动切割出卡片并合成配音文件，可多角色播放并支持一键整合 Zip 导出单个长音频。",
    paste_placeholder: "请在此处粘贴需要朗读的日文原件文本...",
    drag_drop_click: "拖拽标准文本文件 (*.txt) 放入此区域或点击导入文件",
    supported_files: "兼容文件：UTF-8 纯文本文档格式",
    parse_words_btn: "执行语法分句智能切割",
    clear_workspace: "彻底清空工作区",
    quick_stats: "输入语料统计",
    stats_chars: "文本当中汉字字节数:",
    stats_segments: "拆分获得的分句数目:",
    text_segment_list: "语法分句多音轨合成时间轴",
    segment_card: "分段片段 #",
    play_btn: "播放",
    pause_btn: "暂停",
    download_btn: "下载此句",
    gen_tts_btn: "生成合成语音",
    action_batch_download: "一键打包成 ZIP 语音提取包",
    exporting_zip: "正在全力打包 MP3 成 ZIP 文件并自动触发浏览器拉取...",
    
    // TxtUploaderTTS additions
    drag_drop_title: "拖拽您的脚本文本到这里",
    supported_files_desc: "支持含有纯文本对话、分段或结构化剧本的 .txt、.json 和 .xml 文件。",
    browse_files_btn: "浏览文件",
    estimating_lvl: "估算中...",
    level_label: "等级",
    download_mp3_txt: "下载 MP3",
    synthesizing_txt: "配音合成中...",
    generate_speech_txt: "生成配音",
    no_audio_found: "该分段未找到配音音频",
    click_gen_speech_hint: "点击“生成配音”合成该分段的高保真日文配音",
    speed_txt: "语速",
    script_details_txt: "剧本台词详情",
    lines_suffix_txt: "行",
    hide_script_txt: "隐藏剧本",
    show_script_txt: "显示剧本",
    script_hidden_txt: "剧本内容已隐藏",
    script_hidden_desc: "先听录音并测试您的听力理解，然后再点击查看对照文本！",
    click_show_script_btn: "点击显示剧本内容",
    ai_comprehension_insight: "AI 阅读与听力理解精解分析",
    summary_topic_overview: "情景概要与大意概括",
    key_vocab_words: "核心词汇与生词列表",
    uploaded_document_txt: "已加载的脚本文档",
    unload_btn: "卸载",
    playback_segments_title: "播放分段列表",
    audio_ready_txt: "音频已就绪",
    synthesize_all_btn: "一键合成全部",
    zip_btn: "ZIP打包"
  }
};

export function useTranslation() {
  const [lang, setLang] = useState<Language>(currentLanguage);

  useEffect(() => {
    const handleUpdate = (newLang: Language) => setLang(newLang);
    listeners.add(handleUpdate);
    return () => {
      listeners.delete(handleUpdate);
    };
  }, []);

  const t = (key: keyof typeof translations["en"]): string => {
    return translations[lang][key] || translations["en"][key] || (key as string);
  };

  return { t, lang, setLanguage };
}

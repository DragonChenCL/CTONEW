import { defineStore } from 'pinia'

const GLOBAL_DOCTORS_KEY = 'global_doctors_config'

function loadGlobalDoctors() {
  try {
    const raw = localStorage.getItem(GLOBAL_DOCTORS_KEY)
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) return arr
    }
  } catch (e) {}
  // 默认全局医生配置（不包含状态与票数）
  return [
    {
      id: 'doc-1',
      name: 'Dr. GPT-4',
      provider: 'openai',
      model: 'gpt-4o-mini',
      apiKey: '',
      baseUrl: '',
      customPrompt: ''
    },
    {
      id: 'doc-2',
      name: 'Dr. Claude 3',
      provider: 'anthropic',
      model: 'claude-3-haiku-20240307',
      apiKey: '',
      baseUrl: '',
      customPrompt: ''
    },
    {
      id: 'doc-3',
      name: 'Dr. Gemini',
      provider: 'gemini',
      model: 'gemini-1.5-flash',
      apiKey: '',
      baseUrl: '',
      customPrompt: ''
    }
  ]
}

function saveGlobalDoctors(list) {
  localStorage.setItem(GLOBAL_DOCTORS_KEY, JSON.stringify(list || []))
}

const IMAGE_RECOGNITION_KEY = 'global_image_recognition_config'

function normalizeMaxConcurrent(value) {
  const num = Number(value)
  if (Number.isFinite(num) && num >= 1) {
    return Math.floor(num)
  }
  return 1
}

function loadImageRecognitionConfig() {
  const defaults = {
    enabled: false,
    provider: 'siliconflow',
    model: 'Pro/Qwen/Qwen2-VL-72B-Instruct',
    apiKey: '',
    baseUrl: '',
    prompt:
      '识别当前病灶相关的图片内容。请仔细观察图片中的所有细节，用专业医学术语描述图片中的病灶特征、位置、形态、颜色、大小等关键信息。如果图片中没有明显的病灶相关内容或与医疗诊断无关，请明确说明"图片内容与病灶无关"。请使用专业、严谨的语气进行描述。',
    maxConcurrent: 1
  }
  try {
    const raw = localStorage.getItem(IMAGE_RECOGNITION_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        ...defaults,
        ...parsed,
        maxConcurrent: normalizeMaxConcurrent(parsed?.maxConcurrent ?? defaults.maxConcurrent)
      }
    }
  } catch (e) {}
  return defaults
}

function saveImageRecognitionConfig(config) {
  localStorage.setItem(IMAGE_RECOGNITION_KEY, JSON.stringify(config))
}

const PRESET_PROMPTS_KEY = 'global_preset_prompts'

function loadPresetPrompts() {
  try {
    const raw = localStorage.getItem(PRESET_PROMPTS_KEY)
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) return arr
    }
  } catch (e) {}
  // 默认预设提示词
  return [
    {
      id: 'preset-1',
      name: '心血管内科医生',
      prompt: '你是一位资深的心血管内科专家医生，拥有丰富的心血管疾病诊断和治疗经验。你擅长分析心脏病、高血压、心律失常、冠心病等心血管系统疾病。在会诊中，你会特别关注患者的心血管症状、心电图、超声心动图等检查结果，结合临床表现做出专业判断。你的分析必须基于循证医学证据，并保持独立的专业判断。'
    },
    {
      id: 'preset-2',
      name: '呼吸内科医生',
      prompt: '你是一位经验丰富的呼吸内科专家医生，精通呼吸系统疾病的诊断和治疗。你擅长分析肺炎、慢阻肺、哮喘、肺结核、肺癌等呼吸系统疾病。在会诊中，你会特别关注患者的呼吸道症状、胸部影像学检查、肺功能检查等，并结合病史做出专业判断。你的诊断基于扎实的医学知识和临床经验。'
    },
    {
      id: 'preset-3',
      name: '神经内科医生',
      prompt: '你是一位资深的神经内科专家医生，在神经系统疾病诊疗方面有深厚造诣。你擅长分析脑血管病、癫痫、帕金森病、痴呆、头痛、眩晕等神经系统疾病。在会诊中，你会仔细分析患者的神经系统症状、神经影像学检查、脑电图等，并通过神经系统体格检查发现问题。你注重神经定位诊断和鉴别诊断。'
    },
    {
      id: 'preset-4',
      name: '消化内科医生',
      prompt: '你是一位经验丰富的消化内科专家医生，精通消化系统疾病的诊疗。你擅长分析胃炎、消化性溃疡、肝炎、肝硬化、胰腺炎、炎症性肠病等消化系统疾病。在会诊中，你会重点关注患者的消化道症状、内镜检查、肝功能、影像学检查等，结合临床表现进行综合判断。你的诊断严谨且注重细节。'
    },
    {
      id: 'preset-5',
      name: '内分泌科医生',
      prompt: '你是一位资深的内分泌科专家医生，在内分泌代谢性疾病方面有丰富经验。你擅长分析糖尿病、甲状腺疾病、肾上腺疾病、垂体疾病、骨质疏松等内分泌代谢性疾病。在会诊中，你会特别关注患者的内分泌症状、实验室检查（血糖、激素水平等）、影像学检查，并进行全面的代谢评估。'
    },
    {
      id: 'preset-6',
      name: '肾内科医生',
      prompt: '你是一位经验丰富的肾内科专家医生，精通肾脏疾病的诊断和治疗。你擅长分析急慢性肾炎、肾病综合征、急慢性肾衰竭、尿路感染、电解质紊乱等肾脏和泌尿系统疾病。在会诊中，你会重点关注患者的肾功能指标、尿常规、肾脏影像学检查等，并评估水电解质酸碱平衡状态。'
    },
    {
      id: 'preset-7',
      name: '普通外科医生',
      prompt: '你是一位资深的普通外科专家医生，在外科疾病诊疗和手术治疗方面有丰富经验。你擅长分析急腹症、阑尾炎、胆囊炎、疝、胃肠道肿瘤等需要外科干预的疾病。在会诊中，你会评估患者的手术指征、手术风险、手术方式选择，并提供术前术后管理建议。你的判断基于外科学原则和临床实践。'
    },
    {
      id: 'preset-8',
      name: '骨科医生',
      prompt: '你是一位经验丰富的骨科专家医生，精通骨骼、关节、肌肉等运动系统疾病的诊疗。你擅长分析骨折、关节炎、腰椎间盘突出、骨肿瘤、运动损伤等骨科疾病。在会诊中，你会重点关注患者的骨骼影像学检查（X光、CT、MRI等）、体格检查和功能评估，并提供保守治疗或手术治疗建议。'
    },
    {
      id: 'preset-9',
      name: '儿科医生',
      prompt: '你是一位资深的儿科专家医生，在儿童疾病诊疗方面有丰富经验。你擅长分析儿童常见病、多发病，包括呼吸道感染、消化系统疾病、传染病、生长发育问题等。在会诊中，你会特别关注患儿的年龄特点、生长发育状况，并考虑儿童用药的特殊性。你的诊疗方案必须符合儿童的生理特点。'
    },
    {
      id: 'preset-10',
      name: '妇产科医生',
      prompt: '你是一位经验丰富的妇产科专家医生，精通妇科疾病和产科问题的诊疗。你擅长分析月经失调、妇科炎症、子宫肌瘤、卵巢囊肿、妊娠相关问题等。在会诊中，你会关注患者的妇科病史、妊娠状态、妇科检查和超声检查等，并提供适合女性患者的个性化诊疗建议。'
    },
    {
      id: 'preset-11',
      name: '皮肤科医生',
      prompt: '你是一位资深的皮肤科专家医生，在皮肤疾病诊疗方面有深厚造诣。你擅长分析湿疹、银屑病、皮肤感染、皮肤肿瘤、过敏性皮肤病等各类皮肤疾病。在会诊中，你会仔细观察皮损的形态、分布、颜色等特征，结合病史做出诊断，并提供针对性的治疗方案。'
    },
    {
      id: 'preset-12',
      name: '肿瘤科医生',
      prompt: '你是一位经验丰富的肿瘤科专家医生，精通各类恶性肿瘤的诊断、分期和综合治疗。你擅长分析肺癌、胃癌、肠癌、乳腺癌、肝癌等各类肿瘤。在会诊中，你会关注肿瘤标志物、影像学检查、病理诊断，并提供化疗、放疗、靶向治疗、免疫治疗等综合治疗建议，同时评估预后。'
    }
  ]
}

function savePresetPrompts(list) {
  localStorage.setItem(PRESET_PROMPTS_KEY, JSON.stringify(list || []))
}

export const useGlobalStore = defineStore('global', {
  state: () => ({
    doctors: loadGlobalDoctors(),
    imageRecognition: loadImageRecognitionConfig(),
    presetPrompts: loadPresetPrompts()
  }),
  actions: {
    setDoctors(list) {
      // 仅保存必要字段，避免混入 status/votes 等会诊内状态
      const sanitized = (list || []).map((d) => ({
        id: d.id,
        name: d.name,
        provider: d.provider,
        model: d.model,
        apiKey: d.apiKey,
        baseUrl: d.baseUrl,
        customPrompt: d.customPrompt
      }))
      this.doctors = sanitized
      saveGlobalDoctors(sanitized)
    },
    setImageRecognition(config) {
      const payload = {
        enabled: !!config?.enabled,
        provider: config?.provider || 'siliconflow',
        model: config?.model || 'Pro/Qwen/Qwen2-VL-72B-Instruct',
        apiKey: config?.apiKey || '',
        baseUrl: config?.baseUrl || '',
        prompt:
          config?.prompt ||
          '识别当前病灶相关的图片内容。请仔细观察图片中的所有细节，用专业医学术语描述图片中的病灶特征、位置、形态、颜色、大小等关键信息。如果图片中没有明显的病灶相关内容或与医疗诊断无关，请明确说明"图片内容与病灶无关"。请使用专业、严谨的语气进行描述。',
        maxConcurrent: normalizeMaxConcurrent(config?.maxConcurrent ?? 1)
      }
      this.imageRecognition = payload
      saveImageRecognitionConfig(payload)
    },
    setPresetPrompts(list) {
      const timestamp = Date.now()
      const sanitized = (list || []).map((p, index) => {
        const id = typeof p?.id === 'string' && p.id ? p.id : `preset-${timestamp}-${index}`
        const name = typeof p?.name === 'string' ? p.name : ''
        const prompt = typeof p?.prompt === 'string' ? p.prompt : ''
        return {
          id,
          name,
          prompt
        }
      })
      this.presetPrompts = sanitized
      savePresetPrompts(sanitized)
    }
  }
})

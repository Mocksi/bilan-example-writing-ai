// Type definitions for @mlc-ai/web-llm
// This module provides proper types for the WebLLM library

export interface WebLLMConfig {
  model: string
  device?: string
  temperature?: number
  top_p?: number
  max_tokens?: number
  stop?: string[]
}

export interface ChatCompletionRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant'
    content: string
  }>
  temperature?: number
  top_p?: number
  max_tokens?: number
  stop?: string[]
  stream?: boolean
}

export interface ChatCompletionResponse {
  choices: Array<{
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface WebLLMEngine {
  chat: {
    completions: {
      create: (request: ChatCompletionRequest) => Promise<ChatCompletionResponse>
    }
  }
  unload(): Promise<void>
  reload(modelId: string): Promise<void>
  getRuntimeStats(): {
    prefillThroughput: number
    decodingThroughput: number
  }
}

export interface ModelInitProgressCallback {
  (progress: {
    progress: number
    timeElapsed: number
    text: string
  }): void
}

export interface MLCEngineConfig {
  initProgressCallback?: ModelInitProgressCallback
  logLevel?: 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'SILENT'
}

export interface WebLLMModule {
  CreateMLCEngine: (
    modelId: string,
    config?: MLCEngineConfig
  ) => Promise<WebLLMEngine>
  prebuiltAppConfig: {
    model_list: Array<{
      model_id: string
      model: string
      model_lib: string
      vram_required_MB: number
    }>
  }
}

// Available models for content generation (not type import)
export const WEBLLM_MODELS = {
  'Llama-3.2-1B-Instruct-q4f32_1-MLC': {
    id: 'Llama-3.2-1B-Instruct-q4f32_1-MLC',
    name: 'Llama 3.2 1B (Fast)',
    size: '1.2GB',
    description: 'Small, fast model for quick content generation',
    vramRequired: 2048
  },
  'Llama-3.2-3B-Instruct-q4f32_1-MLC': {
    id: 'Llama-3.2-3B-Instruct-q4f32_1-MLC',
    name: 'Llama 3.2 3B (Balanced)',
    size: '2.4GB',
    description: 'Balanced model for high-quality content generation',
    vramRequired: 4096
  },
  'gemma-2-2b-it-q4f32_1-MLC': {
    id: 'gemma-2-2b-it-q4f32_1-MLC',
    name: 'Gemma 2 2B (Creative)',
    size: '1.8GB',
    description: 'Creative model for diverse content generation',
    vramRequired: 3072
  }
} as const

export type WebLLMModelId = keyof typeof WEBLLM_MODELS 
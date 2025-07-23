// Type definitions for @xenova/transformers dynamic import
// This module provides proper types for the transformers library to avoid 'as any' casts

export interface TextGenerationPipeline {
  (input: string, options?: TextGenerationOptions): Promise<TextGenerationResult[] | TextGenerationResult>
}

export interface TextGenerationOptions {
  max_length?: number
  temperature?: number
  do_sample?: boolean
  num_return_sequences?: number
}

export interface TextGenerationResult {
  generated_text: string
}

export interface TransformersModule {
  pipeline: (task: 'text-generation', model: string, options?: PipelineOptions) => Promise<TextGenerationPipeline>
}

export interface PipelineOptions {
  device?: string
  quantized?: boolean
  progress_callback?: (progress: any) => void
}

// Default export type for dynamic import
declare const transformers: TransformersModule
export default transformers 
// Copyright 2025 Google LLC
// SPDX-License-Identifier: Apache-2.0

// This file was generated by jsonschemagen. DO NOT EDIT.

package ai

type dataPart struct {
	Data     any            `json:"data,omitempty"`
	Metadata map[string]any `json:"metadata,omitempty"`
}

type FinishReason string

const (
	FinishReasonStop        FinishReason = "stop"
	FinishReasonLength      FinishReason = "length"
	FinishReasonBlocked     FinishReason = "blocked"
	FinishReasonInterrupted FinishReason = "interrupted"
	FinishReasonOther       FinishReason = "other"
	FinishReasonUnknown     FinishReason = "unknown"
)

type GenerateActionOptions struct {
	Config             any                          `json:"config,omitempty"`
	Docs               []*Document                  `json:"docs,omitempty"`
	MaxTurns           int                          `json:"maxTurns,omitempty"`
	Messages           []*Message                   `json:"messages,omitempty"`
	Model              string                       `json:"model,omitempty"`
	Output             *GenerateActionOptionsOutput `json:"output,omitempty"`
	ReturnToolRequests bool                         `json:"returnToolRequests,omitempty"`
	ToolChoice         ToolChoice                   `json:"toolChoice,omitempty"`
	Tools              []string                     `json:"tools,omitempty"`
}

type GenerateActionOptionsOutput struct {
	ContentType string         `json:"contentType,omitempty"`
	Format      OutputFormat   `json:"format,omitempty"`
	JsonSchema  map[string]any `json:"jsonSchema,omitempty"`
}

type ToolChoice string

const (
	ToolChoiceAuto     ToolChoice = "auto"
	ToolChoiceRequired ToolChoice = "required"
	ToolChoiceNone     ToolChoice = "none"
)

type ModelRequestOutput struct {
	Format OutputFormat   `json:"format,omitempty"`
	Schema map[string]any `json:"schema,omitempty"`
}

type OutputFormat string

const (
	OutputFormatJSON  OutputFormat = "json"
	OutputFormatText  OutputFormat = "text"
	OutputFormatMedia OutputFormat = "media"
)

// GenerationCommonConfig holds configuration for generation.
type GenerationCommonConfig struct {
	MaxOutputTokens int      `json:"maxOutputTokens,omitempty"`
	StopSequences   []string `json:"stopSequences,omitempty"`
	Temperature     float64  `json:"temperature,omitempty"`
	TopK            int      `json:"topK,omitempty"`
	TopP            float64  `json:"topP,omitempty"`
	Version         string   `json:"version,omitempty"`
}

// GenerationUsage provides information about the generation process.
type GenerationUsage struct {
	Custom           map[string]float64 `json:"custom,omitempty"`
	InputAudioFiles  float64            `json:"inputAudioFiles,omitempty"`
	InputCharacters  int                `json:"inputCharacters,omitempty"`
	InputImages      int                `json:"inputImages,omitempty"`
	InputTokens      int                `json:"inputTokens,omitempty"`
	InputVideos      float64            `json:"inputVideos,omitempty"`
	OutputAudioFiles float64            `json:"outputAudioFiles,omitempty"`
	OutputCharacters int                `json:"outputCharacters,omitempty"`
	OutputImages     int                `json:"outputImages,omitempty"`
	OutputTokens     int                `json:"outputTokens,omitempty"`
	OutputVideos     float64            `json:"outputVideos,omitempty"`
	TotalTokens      int                `json:"totalTokens,omitempty"`
}

type mediaPart struct {
	Data     any             `json:"data,omitempty"`
	Media    *mediaPartMedia `json:"media,omitempty"`
	Metadata map[string]any  `json:"metadata,omitempty"`
}

type mediaPartMedia struct {
	ContentType string `json:"contentType,omitempty"`
	Url         string `json:"url,omitempty"`
}

// Message is the contents of a model response.
type Message struct {
	Content  []*Part        `json:"content,omitempty"`
	Metadata map[string]any `json:"metadata,omitempty"`
	Role     Role           `json:"role,omitempty"`
}

type ModelInfo struct {
	Label    string             `json:"label,omitempty"`
	Supports *ModelInfoSupports `json:"supports,omitempty"`
	Versions []string           `json:"versions,omitempty"`
}

type ModelInfoSupports struct {
	Constrained bool         `json:"constrained,omitempty"`
	ContentType []string     `json:"contentType,omitempty"`
	Context     bool         `json:"context,omitempty"`
	Media       bool         `json:"media,omitempty"`
	Multiturn   bool         `json:"multiturn,omitempty"`
	Output      OutputFormat `json:"output,omitempty"`
	SystemRole  bool         `json:"systemRole,omitempty"`
	ToolChoice  bool         `json:"toolChoice,omitempty"`
	Tools       bool         `json:"tools,omitempty"`
}

// A ModelRequest is a request to generate completions from a model.
type ModelRequest struct {
	Config   any        	`json:"config,omitempty"`
	Context  []*Document 	`json:"context,omitempty"`
	Messages []*Message 	`json:"messages,omitempty"`
	// Output describes the desired response format.
	Output     *ModelRequestOutput `json:"output,omitempty"`
	ToolChoice ToolChoice          `json:"toolChoice,omitempty"`
	// Tools lists the available tools that the model can ask the client to run.
	Tools []*ToolDefinition `json:"tools,omitempty"`
}

// A ModelResponse is a model's response to a [ModelRequest].
type ModelResponse struct {
	Custom        any          `json:"custom,omitempty"`
	FinishMessage string       `json:"finishMessage,omitempty"`
	FinishReason  FinishReason `json:"finishReason,omitempty"`
	// LatencyMs is the time the request took in milliseconds.
	LatencyMs float64  `json:"latencyMs,omitempty"`
	Message   *Message `json:"message,omitempty"`
	// Request is the [ModelRequest] struct used to trigger this response.
	Request *ModelRequest `json:"request,omitempty"`
	// Usage describes how many resources were used by this generation request.
	Usage *GenerationUsage `json:"usage,omitempty"`
}

// A ModelResponseChunk is the portion of the [ModelResponse]
// that is passed to a streaming callback.
type ModelResponseChunk struct {
	Aggregated bool    `json:"aggregated,omitempty"`
	Content    []*Part `json:"content,omitempty"`
	Custom     any     `json:"custom,omitempty"`
	Index      int     `json:"index,omitempty"`
	Role       Role    `json:"role,omitempty"`
}

// Role indicates which entity is responsible for the content of a message.
type Role string

const (
	// RoleSystem indicates this message is user-independent context.
	RoleSystem Role = "system"
	// RoleUser indicates this message was generated by the client.
	RoleUser Role = "user"
	// RoleModel indicates this message was generated by the model during a previous interaction.
	RoleModel Role = "model"
	// RoleTool indicates this message was generated by a local tool, likely triggered by a request
	// from the model in one of its previous responses.
	RoleTool Role = "tool"
)

type textPart struct {
	Metadata map[string]any `json:"metadata,omitempty"`
	Text     string         `json:"text,omitempty"`
}

// A ToolDefinition describes a tool.
type ToolDefinition struct {
	Description string `json:"description,omitempty"`
	// Valid JSON Schema representing the input of the tool.
	InputSchema map[string]any `json:"inputSchema,omitempty"`
	// additional metadata for this tool definition
	Metadata map[string]any `json:"metadata,omitempty"`
	Name     string         `json:"name,omitempty"`
	// Valid JSON Schema describing the output of the tool.
	OutputSchema map[string]any `json:"outputSchema,omitempty"`
}

type toolRequestPart struct {
	Metadata    map[string]any `json:"metadata,omitempty"`
	ToolRequest *ToolRequest   `json:"toolRequest,omitempty"`
}

// A ToolRequest is a message from the model to the client that it should run a
// specific tool and pass a [ToolResponse] to the model on the next chat request it makes.
// Any ToolRequest will correspond to some [ToolDefinition] previously sent by the client.
type ToolRequest struct {
	// Input is a JSON object describing the input values to the tool.
	// An example might be map[string]any{"country":"USA", "president":3}.
	Input any    `json:"input,omitempty"`
	Name  string `json:"name,omitempty"`
	Ref   string `json:"ref,omitempty"`
}

type toolResponsePart struct {
	Metadata     map[string]any `json:"metadata,omitempty"`
	ToolResponse *ToolResponse  `json:"toolResponse,omitempty"`
}

// A ToolResponse is a message from the client to the model containing
// the results of running a specific tool on the arguments passed to the client
// by the model in a [ToolRequest].
type ToolResponse struct {
	Name string `json:"name,omitempty"`
	// Output is a JSON object describing the results of running the tool.
	// An example might be map[string]any{"name":"Thomas Jefferson", "born":1743}.
	Output any    `json:"output,omitempty"`
	Ref    string `json:"ref,omitempty"`
}

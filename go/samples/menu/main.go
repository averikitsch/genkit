// Copyright 2024 Google LLC
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"context"
	"log"
	"os"

	"github.com/firebase/genkit/go/genkit"
	"github.com/firebase/genkit/go/plugins/localvec"
	"github.com/firebase/genkit/go/plugins/vertexai"
)

// menuItem is the data model for an item on the menu.
type menuItem struct {
	Title       string  `json:"title" jsonschema_description:"The name of the menu item"`
	Description string  `json:"description" jsonschema_description:"Details including ingredients and preparation"`
	Price       float64 `json:"price" jsonschema_description:"Price in dollars"`
}

// menuQuestionInput is a question about the menu.
type menuQuestionInput struct {
	Question string `json:"question"`
}

// answerOutput is an answer to a question.
type answerOutput struct {
	Answer string `json:"answer"`
}

// dataMenuQuestionInput is a question about the menu,
// where the menu is provided in the JSON data.
type dataMenuQuestionInput struct {
	MenuData []*menuItem `json:"menuData"`
	Question string      `json:"question"`
}

// textMenuQuestionInput is for a question about the menu,
// where the menu is provided as unstructured text.
type textMenuQuestionInput struct {
	MenuText string `json:"menuText"`
	Question string `json:"question"`
}

func main() {
	ctx := context.Background()
	g, err := genkit.Init(ctx)
	if err != nil {
		log.Fatalf("failed to create Genkit: %v", err)
	}
	err = vertexai.Init(ctx, g, &vertexai.Config{Location: os.Getenv("GCLOUD_LOCATION")})
	if err != nil {
		log.Fatal(err)
	}

	model := vertexai.Model(g, "gemini-2.0-flash")
	embedder := vertexai.Embedder(g, "text-embedding-004")

	if err := setup01(g, model); err != nil {
		log.Fatal(err)
	}
	if err := setup02(g, model); err != nil {
		log.Fatal(err)
	}
	if err := setup03(g, model); err != nil {
		log.Fatal(err)
	}

	err = localvec.Init()
	if err != nil {
		log.Fatal(err)
	}
	indexer, retriever, err := localvec.DefineIndexerAndRetriever(g, "go-menu_items", localvec.Config{
		Embedder: embedder,
	})
	if err != nil {
		log.Fatal(err)
	}
	if err := setup04(g, indexer, retriever, model); err != nil {
		log.Fatal(err)
	}

	if err := setup05(g, model); err != nil {
		log.Fatal(err)
	}

	<-ctx.Done()
}

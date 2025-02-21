# Writing a Genkit Evaluator

Firebase Genkit can be extended to support custom evaluation of test case output, either by using an LLM as a judge, or purely programmatically.

## Evaluator definition

Evaluators are functions that assess the content given to and generated by an LLM. There are two main approaches to automated evaluation (testing): heuristic assessment and LLM-based assessment. In the heuristic approach, you define a deterministic function like those of traditional software development. In an LLM-based assessment, the content is fed back to an LLM and the LLM is asked to score the output according to criteria set in a prompt.

### LLM based Evaluators

An LLM-based evaluator leverages an LLM to evaluate the input, context, or output of your generative AI feature.

LLM-based evaluators in Genkit are made up of 3 components:

- A prompt
- A scoring function
- An evaluator action

#### Define the prompt

For this example, the prompt is going to ask the LLM to judge how delicious the output is. First, provide context to the LLM, then describe what you want it to do, and finally, give it a few examples to base its response on.

Genkit’s `definePrompt` utility provides an easy way to define prompts with input and output validation. Here’s how you can set up an evaluation prompt with `definePrompt`.

```ts
const DELICIOUSNESS_VALUES = ['yes', 'no', 'maybe'] as const;

const DeliciousnessDetectionResponseSchema = z.object({
  reason: z.string(),
  verdict: z.enum(DELICIOUSNESS_VALUES),
});
type DeliciousnessDetectionResponse = z.infer<typeof DeliciousnessDetectionResponseSchema>;

const DELICIOUSNESS_PROMPT = ai.definePrompt(
  {
    name: 'deliciousnessPrompt',
    inputSchema: z.object({
      output: z.string(),
    }),
    outputSchema: DeliciousnessDetectionResponseSchema,
  },
  `You are a food critic. Assess whether the provided output sounds delicious, giving only "yes" (delicious), "no" (not delicious), or "maybe" (undecided) as the verdict.

  Examples:
  Output: Chicken parm sandwich
  Response: { "reason": "A classic and beloved dish.", "verdict": "yes" }

  Output: Boston Logan Airport tarmac
  Response: { "reason": "Not edible.", "verdict": "no" }

  Output: A juicy piece of gossip
  Response: { "reason": "Metaphorically 'tasty' but not food.", "verdict": "maybe" }

  New Output:
  {{output}}
  Response:
  `
);
```

#### Define the scoring function

Now, define the function that will take an example which includes `output` as is required by the prompt and score the result. Genkit test cases include `input` as required a required field, with optional fields for `output` and `context`. It is the responsibility of the evaluator to validate that all fields required for evaluation are present.

```ts
import { BaseEvalDataPoint, Score } from 'genkit/evaluator';

/**
 * Score an individual test case for delciousness.
 */
export async function deliciousnessScore<
  CustomModelOptions extends z.ZodTypeAny,
>(
  judgeLlm: ModelArgument<CustomModelOptions>,
  dataPoint: BaseEvalDataPoint,
  judgeConfig?: CustomModelOptions
): Promise<Score> {
  const d = dataPoint;
  // Validate the input has required fields
  if (!d.output) {
    throw new Error('Output is required for Deliciousness detection');
  }

  //Hydrate the prompt
  const finalPrompt = DELICIOUSNESS_PROMPT.renderText({
    output: d.output as string,
  });

  // Call the LLM to generate an evaluation result
  const response = await generate({
    model: judgeLlm,
    prompt: finalPrompt,
    config: judgeConfig,
  });

  // Parse the output
  const parsedResponse = response.output;
  if (!parsedResponse) {
    throw new Error(`Unable to parse evaluator response: ${response.text}`);
  }

  // Return a scored response
  return {
    score: parsedResponse.verdict,
    details: { reasoning: parsedResponse.reason },
  };
}
```

#### Define the evaluator action

The final step is to write a function that defines the evaluator action itself.

```ts
import { BaseEvalDataPoint, EvaluatorAction } from 'genkit/evaluator';

/**
 * Create the Deliciousness evaluator action.
 */
export function createDeliciousnessEvaluator<
  ModelCustomOptions extends z.ZodTypeAny,
>(
  judge: ModelReference<ModelCustomOptions>,
  judgeConfig: z.infer<ModelCustomOptions>
): EvaluatorAction {
  return defineEvaluator(
    {
      name: `myAwesomeEval/deliciousness`,
      displayName: 'Deliciousness',
      definition: 'Determines if output is considered delicous.',
    },
    async (datapoint: BaseEvalDataPoint) => {
      const score = await deliciousnessScore(judge, datapoint, judgeConfig);
      return {
        testCaseId: datapoint.testCaseId,
        evaluation: score,
      };
    }
  );
}
```

### Heuristic Evaluators

A heuristic evaluator can be any function used to evaluate the input, context, or output of your generative AI feature.

Heuristic evaluators in Genkit are made up of 2 components:

- A scoring function
- An evaluator action

#### Define the scoring function

Just like the LLM-based evaluator, define the scoring function. In this case, the scoring function does not need to know about the judge LLM or its config.

```ts
import { BaseEvalDataPoint, Score } from 'genkit/evaluator';

const US_PHONE_REGEX =
  /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4}$/i;

/**
 * Scores whether an individual datapoint matches a US Phone Regex.
 */
export async function usPhoneRegexScore(
  dataPoint: BaseEvalDataPoint
): Promise<Score> {
  const d = dataPoint;
  if (!d.output || typeof d.output !== 'string') {
    throw new Error('String output is required for regex matching');
  }
  const matches = US_PHONE_REGEX.test(d.output as string);
  const reasoning = matches
    ? `Output matched regex ${regex.source}`
    : `Output did not match regex ${regex.source}`;
  return {
    score: matches,
    details: { reasoning },
  };
}
```

#### Define the evaluator action

```ts
import { BaseEvalDataPoint, EvaluatorAction } from 'genkit/evaluator';

/**
 * Configures a regex evaluator to match a US phone number.
 */
export function createUSPhoneRegexEvaluator(
  metrics: RegexMetric[]
): EvaluatorAction[] {
  return metrics.map((metric) => {
    const regexMetric = metric as RegexMetric;
    return defineEvaluator(
      {
        name: `myAwesomeEval/${metric.name.toLocaleLowerCase()}`,
        displayName: 'Regex Match',
        definition:
          'Runs the output against a regex and responds with 1 if a match is found and 0 otherwise.',
        isBilled: false,
      },
      async (datapoint: BaseEvalDataPoint) => {
        const score = await regexMatchScore(datapoint, regexMetric.regex);
        return fillScores(datapoint, score);
      }
    );
  });
}
```

## Configuration

### Plugin Options

Define the `PluginOptions` that the custom evaluator plugin will use. This object has no strict requirements and is dependent on the types of evaluators that are defined.

At a minimum it will need to take the definition of which metrics to register.

```ts
export enum MyAwesomeMetric {
  WORD_COUNT = 'WORD_COUNT',
  US_PHONE_REGEX_MATCH = 'US_PHONE_REGEX_MATCH',
}

export interface PluginOptions {
  metrics?: Array<MyAwesomeMetric>;
}
```

If this new plugin uses an LLM as a judge and the plugin supports swapping out which LLM to use, define additional parameters in the `PluginOptions` object.

```ts
export enum MyAwesomeMetric {
  DELICIOUSNESS = 'DELICIOUSNESS',
  US_PHONE_REGEX_MATCH = 'US_PHONE_REGEX_MATCH',
}

export interface PluginOptions<ModelCustomOptions extends z.ZodTypeAny> {
  judge: ModelReference<ModelCustomOptions>;
  judgeConfig?: z.infer<ModelCustomOptions>;
  metrics?: Array<MyAwesomeMetric>;
}
```

### Plugin definition

Plugins are registered with the framework via the `genkit.config.ts` file in a project. To be able to configure a new plugin, define a function that defines a `GenkitPlugin` and configures it with the `PluginOptions` defined above.

In this case we have two evaluators `DELICIOUSNESS` and `US_PHONE_REGEX_MATCH`. This is where those evaluators are registered with the plugin and with Firebase Genkit.

```ts
export function myAwesomeEval<ModelCustomOptions extends z.ZodTypeAny>(
  options: PluginOptions<ModelCustomOptions>
): PluginProvider {
  // Define the new plugin
  const plugin = (options?: MyPluginOptions<ModelCustomOptions>) => {
    return genkitPlugin(
    'myAwesomeEval',
    async (ai: Genkit) => {
      const { judge, judgeConfig, metrics } = options;
      const evaluators: EvaluatorAction[] = metrics.map((metric) => {
        switch (metric) {
          case DELICIOUSNESS:
            // This evaluator requires an LLM as judge
            return createDeliciousnessEvaluator(ai, judge, judgeConfig);
          case US_PHONE_REGEX_MATCH:
            // This evaluator does not require an LLM
            return createUSPhoneRegexEvaluator();
        }
      });
      return { evaluators };
    })
  }
  // Create the plugin with the passed options
  return plugin(options);
}
export default myAwesomeEval;
```

### Configure Genkit

Add the newly defined plugin to your Genkit configuration.

For evaluation with Gemini, disable safety settings so that the evaluator can accept, detect, and score potentially harmful content.

```ts
import { gemini15Flash } from '@genkit-ai/googleai';

const ai = genkit({
  plugins: [
    ...
    myAwesomeEval({
      judge: gemini15Flash,
      judgeConfig: {
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_NONE',
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_NONE',
          },
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_NONE',
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_NONE',
          },
        ],
      },
      metrics: [
        MyAwesomeMetric.DELICIOUSNESS,
        MyAwesomeMetric.US_PHONE_REGEX_MATCH
      ],
    }),
  ],
  ...
});
```

## Testing

The same issues that apply to evaluating the quality of the output of a generative AI feature apply to evaluating the judging capacity of an LLM-based evaluator.

To get a sense of whether the custom evaluator performs at the expected level, create a set of test cases that have a clear right and wrong answer.

As an example for deliciousness, that might look like a json file `deliciousness_dataset.json`:

```json
[
  {
    "testCaseId": "delicous_mango",
    "input": "What is a super delicious fruit",
    "output": "A perfectly ripe mango – sweet, juicy, and with a hint of tropical sunshine."
  },
  {
    "testCaseId": "disgusting_soggy_cereal",
    "input": "What is something that is tasty when fresh but less tasty after some time?",
    "output": "Stale, flavorless cereal that's been sitting in the box too long."
  }
]
```

These examples can be human generated or you can ask an LLM to help create a set of test cases that can be curated. There are many available benchmark datasets that can be used as well.

Then use the Genkit CLI to run the evaluator against these test cases.

```bash
genkit eval:run deliciousness_dataset.json
```

View your results in the Genkit UI.

```bash
genkit start
```

Navigate to `localhost:4000/evaluate`.

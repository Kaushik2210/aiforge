/** The 23 realms of the syllabus. `open` realms have playable quests today. */
export interface Realm {
  n: number;
  name: string;
  blurb: string;
  quest?: string; // quest id when playable
}

export const REALMS: Realm[] = [
  { n: 1, name: "Programming Fundamentals", blurb: "Python, Git, HTTP, the CLI" },
  { n: 2, name: "Maths and ML Foundations", blurb: "Gradients, probability, first models", quest: "gradient-descent" },
  { n: 3, name: "Data Engineering", blurb: "NumPy, pandas, SQL, clean datasets" },
  { n: 4, name: "Deep Learning", blurb: "Backprop, optimisers, attention" },
  { n: 5, name: "DL Frameworks", blurb: "PyTorch, Hugging Face, CUDA basics" },
  { n: 6, name: "LLM Fundamentals", blurb: "Tokens, transformers, pretraining" },
  { n: 7, name: "LLM APIs", blurb: "Streaming, tools, retries, cost" },
  { n: 8, name: "Prompt and Context Engineering", blurb: "Budgets, injection defence" },
  { n: 9, name: "Embeddings and Vector DBs", blurb: "Similarity, ANN, hybrid search" },
  { n: 10, name: "RAG", blurb: "Chunking, retrieval, grounding" },
  { n: 11, name: "AI Agents", blurb: "Loops, tools, reliability" },
  { n: 12, name: "AI Frameworks", blurb: "LangGraph, DSPy and when to skip them" },
  { n: 13, name: "Fine-Tuning", blurb: "LoRA, QLoRA, DPO, data quality" },
  { n: 14, name: "Multimodal AI", blurb: "Vision, speech, diffusion" },
  { n: 15, name: "Evals and Testing", blurb: "Judges, golden sets, regressions" },
  { n: 16, name: "Inference Engineering", blurb: "KV cache, batching, quantisation" },
  { n: 17, name: "Backend for AI", blurb: "FastAPI, queues, caching" },
  { n: 18, name: "MLOps and LLMOps", blurb: "Tracing, versioning, CI gates" },
  { n: 19, name: "Cloud and DevOps", blurb: "Docker, Kubernetes, Terraform" },
  { n: 20, name: "AI Security", blurb: "OWASP LLM, guardrails, red teaming" },
  { n: 21, name: "System Design", blurb: "SLOs, routing, multi-tenancy" },
  { n: 22, name: "Real-World Projects", blurb: "Portfolio-grade capstones" },
  { n: 23, name: "Career", blurb: "Portfolio, interviews, open source" },
];

export const RANKS = [
  "Initiate",
  "Apprentice",
  "Practitioner",
  "Engineer",
  "Senior",
  "Architect",
  "Production-Ready AI Engineer",
];

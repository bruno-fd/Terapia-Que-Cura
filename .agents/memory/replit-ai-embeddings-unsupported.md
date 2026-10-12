---
name: Replit AI Integrations não fazem embeddings
description: O proxy de AI Integrations (OpenAI e Gemini) não roteia a embeddings API; qualquer feature vetorial precisa de chave própria.
---

As AI Integrations do Replit (proxy sem chave própria) **não suportam a embeddings API**
— nem no provider OpenAI nem no Gemini. Ambas as skills listam "embeddings" em
"Unsupported Capabilities". O proxy roteia chat/responses/imagens/áudio apenas.

**Why:** um bundle externo assumia que `AI_INTEGRATIONS_OPENAI_BASE_URL` + `.../embeddings`
funcionaria "igual ao Anthropic"; a documentação da própria integração diz o contrário.
Confiar nisso levaria a um fail-open silencioso (só camada lexical) sem ninguém perceber.

**How to apply:** para busca semântica, deduplicação vetorial, RAG ou pgvector, peça uma
chave própria (`requestSecrets`) de um provider OpenAI-compatível ou Voyage. Não gaste
tempo tentando o proxy. Se o código tiver fail-open, verifique empiricamente que a coluna
de embedding foi preenchida (`count(embedding)`) em vez de assumir que funcionou.

# MCP do Aquário

## Auditoria inicial

O servidor já expunha nove ferramentas em `/api/mcp` com Streamable HTTP e `mcp-handler`. O Supabase Auth emitia e validava o token OAuth e o consentimento usava o fluxo da app. As consultas à base de dados e ao Storage já corriam com o JWT do utilizador e as políticas RLS existentes.

As nove ferramentas estavam registadas. O resumo recorria a amostras globais de medições e TPAs, que podiam omitir o último registo de um aquário menos ativo. A população podia ser calculada sobre um histórico truncado pelo limite implícito do PostgREST. Faltavam um contexto por aquário, uma timeline paginada e uma forma de pedir os bytes de uma foto. A lista de fotos devolvia URLs assinados e o tipo de evento, sem o ID da foto ou do evento. A capacidade de o Claude analisar imagens a partir desses URLs não estava verificada.

A base guarda aquários com volumes e notas, medições, TPAs com condicionador, produtos, movimentos e grupos de fauna, ninhadas, alertas, desejos e fontes externas. As fotografias da galeria têm ID, aquário, data, etiqueta, legenda e relação opcional com um evento. As capas e as fotografias de fauna referenciam IDs da galeria. Dimensões, equipamentos, substrato, iluminação, plantas, fertilização e intervenções no filtro podem surgir em texto livre. O esquema atual não tem campos estruturados para esses dados. A rotina de esponja é uma preferência, sem histórico de manutenção do filtro.

## Consultar em três passos

1. Usa `resumo_aquarios` com `{"modo":"compacto"}` para descobrir IDs, o último registo de medição e a última TPA de cada aquário, alertas ativos da conta e os últimos acontecimentos.
2. Usa `contexto_aquario` com `{"aquario":"Principal","dias":30}` para obter um contexto único. Inclui os últimos valores conhecidos **por parâmetro**, com data, unidade e ID, fauna derivada por espécie e grupo, ninhadas ativas, rotina global, última TPA e produtos ativos da conta. `limite` controla os acontecimentos devolvidos e `incluir_produtos:false` omite a lista da conta.
3. Aprofunda com `medicoes`, `linha_temporal` ou `fotos_recentes`. Usa o UUID se o nome corresponder a vários aquários.

## Contratos

| Ferramenta | Entrada e resposta |
| --- | --- |
| `resumo_aquarios` | Sem argumentos mantém o objeto anterior, com IDs e indicação de amostras truncadas. `modo:"compacto"` devolve até 20 aquários, 6 alertas ativos e 6 acontecimentos dos últimos 7 dias. A última medição do modo compacto é um único registo. |
| `contexto_aquario` | `aquario` obrigatório. `dias` 30 por defeito, `de`, `ate`, `limite` 12 até 30 e `incluir_produtos` por defeito ligado. A janela restringe a timeline. O estado é consultado no momento da chamada. |
| `linha_temporal` | `aquario`, `dias` 30 por defeito, `de`, `ate`, `tipos`, `limite` 30 até 100 e `cursor`. Devolve `periodo`, `eventos` e `proximo_cursor`. Tipos disponíveis: `fauna`, `foto`, `medicao`, `ninhada`, `tpa`. Transferências aparecem em consultas da origem ou do destino. A data da timeline de ninhadas é a criação do registo, com `data_parto` em separado. |
| `ultimas_tpas` | `aquario`, `dias` 30 por defeito, `de`, `ate` e `limite` até 100. Mantém a lista anterior, com IDs e indicação do volume utilizado no cálculo da percentagem. Usa `linha_temporal` para paginar. |
| `medicoes` | `aquario`, `dias` 30 por defeito, `de`, `ate`, `parametro`, `limite` até 100 e `cursor`. Mantém `referencias` e `medicoes`, com IDs, período e cursor. Para um parâmetro, apresenta variação líquida, contagem e maior intervalo entre leituras **na página**. As referências do modo anterior continuam a ser as referências genéricas da app. |
| `fauna_e_ninhadas` | `aquario`, `dias` 60 por defeito, `de`, `ate` e `limite` até 100. Mantém a lista por aquário com população, movimentos e ninhadas, e acrescenta IDs, variedade e referências à galeria. Usa `linha_temporal` para paginar movimentos ou ninhadas. |
| `fotos_recentes` | `aquario`, `dias` 14 por defeito, `de`, `ate`, `etiqueta`, `evento_id`, `limite` até 50, `ordem` e `cursor`. `modo:"metadados"` devolve `periodo`, `itens` e `proximo_cursor` sem chamar o Storage. Sem modo mantém a lista com URLs assinados e inclui IDs. A expiração passa de 60 para 10 minutos. |
| `conteudo_foto` | `id` obrigatório. `tamanho:"analise"` por defeito ou `"miniatura"`. Devolve um bloco de texto JSON com metadados e um bloco MCP `image` com JPEG em base64. |
| `alertas_recentes` | `dias` 14 por defeito, `de`, `ate`, `estado` e `limite` até 100. Mantém o histórico da conta e inclui o estado dos alertas interativos. |
| `lista_desejos` | `estado` opcional e `limite` até 100. Mantém a lista com preço, loja, URL e notas. |
| `novidades_externas` | `dias` 14 por defeito, `de`, `ate` e `limite` até 100. `incluir_estado:true` acrescenta até 10 resultados atuais já guardados das fontes ativas, com data da verificação. Este modo devolve um objeto com `novidades` e `estado_fontes`. Os resultados da torneira e meteorologia são externos. |
| `resumo_semanal` | Sem argumentos mantém o formato do resumo da última semana. Aceita `de` e `ate`. `modo:"incremental"` acrescenta um checkpoint, o estado compacto, uma página da timeline e até 10 alertas, novidades e desejos criados por secção. |

Os intervalos são `[de, ate)` e têm até 366 dias. Os timestamps ISO exigem fuso explícito. As páginas usam ordem descendente por data e ID, com desempate por tipo na timeline. Para ver primeiro as fotos mais antigas, pede `ordem:"asc"`. Ao pedir a página seguinte, reutiliza o `periodo`, a ordem, os filtros e o `proximo_cursor` da resposta. A consulta preserva o timestamp do registo, incluindo a precisão que o Supabase devolve. Proximidade temporal entre dois eventos não indica causalidade.

Uma leitura zero é um valor medido. Nos resumos, `null` identifica dados ausentes e a data de cada última leitura permite avaliar a sua antiguidade. No histórico antigo, o mapa `valores` continua a omitir parâmetros não medidos. As notas e legendas podem ser abreviadas. A fauna é derivada do histórico de movimentos, incluindo transferências. Se este ultrapassar o orçamento de 3 000 eventos, o total é desconhecido. O contexto indica quando as listas de grupos, ninhadas ou produtos excedem o limite apresentado. Sem TPA ou periodicidade conhecida, `tpa_em_atraso` no resumo antigo é `null`.

## Fotografias e permissões

A foto é procurada pelo UUID na tabela `fotos` com RLS. O download lê o bucket privado `fotos` com o mesmo JWT. Só aceita caminhos que comecem pelo ID do aquário associado ou pelo ID do utilizador, para suportar os dois formatos de armazenamento existentes. O MCP redimensiona com Sharp, corrige orientação, preserva proporções e remove EXIF. A análise usa até 1280 px no lado maior e a miniatura até 480 px. Cada chamada aceita um ID, lê até 5 MiB por ficheiro, limita a descodificação a 16 megapíxeis e devolve até 512 KiB de JPEG. Se o ficheiro principal estiver indisponível, o servidor pode usar a miniatura. O resultado identifica qual foi usada. Alguns ficheiros legados HEIC dependem do descodificador disponível. Os anexos da lista de desejos não pertencem à galeria.

A rota exige um token válido e mantém a allowlist opcional de emails `MCP_EMAILS_PERMITIDOS`. O cliente de dados rejeita métodos de escrita e permite o POST de assinatura de URLs do Storage apenas para o modo legado. As respostas autenticadas usam `private, no-store`. O servidor trata notas, legendas, nomes e conteúdo externo como dados não confiáveis. As permissões de um JWT apresentado **diretamente** à API Supabase continuam a depender das políticas existentes. Limitar também esse acesso a leitura exigiria políticas específicas por cliente OAuth. [Segurança de tokens OAuth e RLS no Supabase](https://supabase.com/docs/guides/auth/oauth-server/token-security)

## Exemplos para Claude

- «Posso colocar mais três guppies no Principal?» Usa `resumo_aquarios` compacto e `contexto_aquario`. Considera volume útil, grupos atuais, idade das últimas medições e manutenção.
- «As plantas vermelhas estão a melhorar?» Usa `fotos_recentes` com `modo:"metadados"` e `etiqueta:"plantas"`. Seleciona IDs de datas distintas e chama `conteudo_foto` para cada um. Compara com as medições e notas disponíveis na mesma janela.
- «O que mudou nas duas semanas antes da perda dos camarões?» Usa `linha_temporal` com as datas e o aquário. Compara os IDs de eventos ligados a fotografias e identifica períodos sem leituras com `medicoes`.
- «Vale a pena comprar este fertilizante?» Consulta as notas e produtos em `contexto_aquario`, os desejos e os registos de manutenção. Trata detalhes de fertilização ausentes como desconhecidos.
- «Faz o resumo desde o último relatório.» Usa `resumo_semanal` incremental. Antes de avançar o checkpoint, percorre a timeline se houver cursor e regista as secções que indicarem truncamento. Na execução seguinte, usa `proximo_inicio` como `de`. Esta estratégia evita sobreposição por data do acontecimento. Edições e entradas retroativas exigem consultar novamente a janela relevante.

## Validação e publicação

```sh
npm run typecheck
npm run lint
npx playwright test -c tests/mcp/playwright.config.ts
```

A suite chama o handler real com pedidos MCP JSON-RPC e simula Auth, PostgREST e Storage. Cobre descoberta, autenticação, isolamento simulado entre contas, compatibilidade, datas e paginação, tratamento de falhas, e leitura e descodificação do JPEG resultante. O teste SQL existente `tests/sql/fauna-visual.sql` pode ser executado numa base PostgreSQL descartável para verificar as relações e RLS de fotografias e fauna.

A publicação usa o deploy normal da aplicação, com o mesmo URL e configuração OAuth. O servidor usa o runtime Node.js e o pacote Sharp que o Next.js já instalava. Não há migrações nem variáveis novas. Depois de publicar, pede no Claude uma comparação entre duas fotos privadas conhecidas e verifica se a chamada `conteudo_foto` resulta numa descrição visual concreta. O formato `image` foi validado no transporte local. O conector real e a interpretação no Claude ainda precisam desse teste. [Especificação MCP para conteúdo de imagem](https://modelcontextprotocol.io/specification/2025-11-25/server/tools#image-content)

A Anthropic documenta conectores remotos no Cowork e o uso de conectores nas tarefas agendadas. O MCP oferece uma janela incremental que essas tarefas podem chamar. A execução com este conector autenticado e a persistência do checkpoint dependem da conta e da configuração da tarefa. Ainda precisam de um teste **Run now** no Cowork. [Conectores MCP remotos no Claude](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp) · [Tarefas agendadas no Cowork](https://support.claude.com/en/articles/13854387-schedule-recurring-tasks-in-claude-cowork)

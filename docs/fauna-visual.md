# Fauna visual e capa do aquário

- **Adicionar animais:** no formulário Fauna, regista uma Entrada ou um Nascimento. A espécie e a quantidade continuam suficientes. Variedade, nome (para um único animal), fotografia e notas são opcionais.
- **Identificar animais existentes:** no separador Fauna, abre um grupo genérico e escolhe **Detalhar animais deste grupo**. A operação fica no histórico e identifica a quantidade escolhida sem aumentar o total nem criar outra espécie.
- **Movimentar um grupo:** abre o cartão identificado ou escolhe o grupo no formulário de saída, morte ou transferência. A transferência mantém a identificação no destino. Para mudar a quantidade de um registo, edita o respetivo evento no histórico.
- **Fotografias:** pode escolher-se uma foto da galeria do aquário ou carregar uma nova. Fotos novas são comprimidas e guardadas na galeria privada, com miniatura. Remover uma associação conserva a foto. Se a fotografia for guardada mas o evento for rejeitado, ela fica na galeria e pode ser usada ao voltar a tentar.
- **Capa:** em Opções do aquário → Escolher capa, seleciona uma foto ou mantém a mais recente. O topo mostra até cinco fotos; o visualizador abre a galeria completa.

A migração `20261106000011_fauna_visual.sql` acrescenta colunas aos eventos existentes e referências às fotografias. `detalhe` é um evento de classificação com efeito zero na população; entradas, nascimentos, saídas e transferências continuam a alimentar os totais por espécie. Os endpoints de resumo do MCP mantêm o formato e excluem as classificações do feed de movimentos. Não há migração de dados nem alterações às políticas de Storage.

Detalhes, edições e saídas aguardam a validação do servidor. Entradas e nascimentos genéricos continuam disponíveis no modo offline. A escolha de capa requer ligação.

Teste da migração: numa base PostgreSQL descartável e vazia, executar `psql -X -v ON_ERROR_STOP=1 -f tests/sql/fauna-visual.sql`. O teste carrega o esquema base real, cria apenas dados sintéticos e verifica saldos, transferências e referências a fotos sob RLS.

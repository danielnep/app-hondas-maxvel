# Ronda Pro | Perfis de teste no Railway

A aplicação no domínio `https://ronda-pro-production.up.railway.app/` usa autenticação real (SQLite no volume persistente), distinta do login temporário local do GitHub Pages.

| Perfil | Usuário ou e-mail | Role |
| --- | --- | --- |
| Administrador | `admin` / `admin@rondapro.local` | `admin` |
| COI | `coi` / `coi@rondapro.local` | `coi` |
| Vigia | `vigia` / `vigia@rondapro.local` | `ronda` |
| Vistoriador | `vistoriador` / `vistoriador@rondapro.local` | `vistoriador` |

As senhas dos testes ficam apenas na configuração privada `RONDA_PRO_INITIAL_ACCOUNTS` do Railway. Os valores do GitHub Pages podem coincidir apenas durante a avaliação. Nunca usar essas credenciais públicas em operação real.

A variável `RONDA_PRO_INITIAL_ACCOUNTS_REVISION` permite trocar as senhas de contas iniciais sem recriar usuários ou apagar rondas, ocorrências, evidências e vínculos. Somente contas com usuário, e-mail e perfil exatamente correspondentes às sementes são atualizadas; as sessões anteriores são revogadas. Migração testada em `tests/bootstrap-credentials-rotation.test.mjs`.

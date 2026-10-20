# Acessos operacionais de teste | Ronda Pro

Os quatro perfis iniciais usam o mesmo backend autenticado do Ronda Pro, hospedado no Railway.

| Perfil | Usuário | E-mail | Role |
|---|---|---|---|
| Administrador | `admin` | `admin@rondapro.local` | `admin` |
| Operador COI | `coi` | `coi@rondapro.local` | `coi` |
| Vigia | `vigia` | `vigia@rondapro.local` | `ronda` |
| Vistoriador | `vistoriador` | `vistoriador@rondapro.local` | `vistoriador` |

**Senhas:** não publicar em arquivos, commits, Issues, workflows ou Pull Requests. Os segredos de teste estão no Railway em `RONDA_PRO_INITIAL_ACCOUNTS`, na configuração do serviço `ronda-pro`.

## Rotação sem perda de dados

- `RONDA_PRO_INITIAL_ACCOUNTS`: JSON com contas, perfis, nomes de usuário, e-mails e senhas (variável de ambiente privada).
- `RONDA_PRO_INITIAL_ACCOUNTS_REVISION`: número inteiro crescente para autorizar a troca das senhas de contas já existentes.
- Sem uma revisão maior, reiniciar o serviço não altera senhas existentes.
- Ao aumentar a revisão, a inicialização compara usuário, e-mail e perfil antes de trocar o hash da senha; invalida tokens anteriores e preserva IDs, dados, rondas e histórico.
- Se os dados da identidade não corresponderem, a senha não é alterada automaticamente.
- Revisões mais baixas não revertem senhas.

O site estático no Netlify não substitui a API autenticada. Para testar autenticação real, usar o domínio do serviço Railway: https://ronda-pro-production.up.railway.app/.

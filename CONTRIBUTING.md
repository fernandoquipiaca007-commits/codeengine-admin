# 🌿 Contribuindo — codeengine-admin

Painel administrativo da plataforma CodeEngine Learn.
Para o fluxo completo, ver o [CONTRIBUTING.md do repositório frontend](https://github.com/fernandoquipiaca007/codeengine-learn/blob/main/CONTRIBUTING.md).

## Resumo do fluxo

```
main          ← produção
└── develop   ← integração
       ├── feature/<nome>
       ├── fix/<nome>
       └── hotfix/<nome>   (a partir de main)
```

1. Crie branch a partir de `develop`
2. Commits em [Conventional Commits](https://www.conventionalcommits.org/)
3. `git push -u origin <branch>` → abra PR para `develop`
4. CI deve passar + 1 review → merge (squash)

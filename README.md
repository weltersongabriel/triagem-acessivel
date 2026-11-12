# Triagem Acessível

PWA em português do Brasil para ajudar uma pessoa a organizar respostas de triagem e mostrá-las a um profissional de saúde. O app não faz diagnóstico, não envia respostas a um servidor e não substitui atendimento profissional.

## Iniciar e validar

Requer Node.js 22.12+ e npm.

```sh
npm ci
npm run dev
```

O Vite informa o endereço local (normalmente `http://localhost:5173`). Para validar a aplicação:

```sh
npm test
npm run typecheck
npm run build
npm run preview
```

`npm run build` executa primeiro o TypeScript (`tsc --noEmit`) e depois gera a versão de produção em `dist/`. Sirva `dist/` por HTTPS ou em `localhost` para testar instalação e uso offline do PWA.

## Acessibilidade e funcionamento

- Perguntas, respostas anteriores, resumo, correção, reinício e pedido de ajuda seguem disponíveis em uma única página rolável.
- Voz usa a API de síntese de fala do navegador com idioma `pt-BR`, se disponível. A disponibilidade de uma voz offline depende do navegador e das vozes instaladas no dispositivo.
- Os modos Criança e Alto contraste, o tamanho do texto, o tema, o suporte a teclado e a redução de movimento seguem disponíveis.
- O service worker guarda o shell do app e os recursos carregados no cache local para uso offline após uma primeira abertura com conexão.
- Respostas só ficam na memória durante a triagem atual; não são persistidas nem transmitidas.

## Modelo corporal e atribuições

O mapa corporal usa um modelo humano 3D local, com iluminação e controles para girar, aproximar e selecionar regiões por toque ou pela lista acessível. O arquivo OBJ é armazenado no app e incluído no cache offline. O modelo é uma referência visual para organizar sintomas, não é uma ferramenta clínica e não substitui avaliação profissional.

O modelo base `public/models/makehuman-base.obj` foi obtido do [projeto MakeHuman](https://github.com/makehumancommunity/makehuman), criado por Data Collection AB, Joel Palmius e Jonas Hauquier, e está identificado como CC0 em seu cabeçalho. A biblioteca [Three.js](https://threejs.org/) é usada para renderizá-lo no navegador. Os três ícones de instalação (`public/icon-192.png`, `public/icon-512.png` e `public/icon-maskable-512.png`) foram mantidos do projeto original; os arquivos herdados não informavam autoria ou licença.

Fontes, scripts, ícones vetoriais da interface e ilustração do corpo são locais. Não há chamadas a CDNs ou serviços remotos no fluxo da aplicação.

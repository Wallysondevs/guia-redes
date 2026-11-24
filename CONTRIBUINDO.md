# Como contribuir com o Guia Redes

## Adicionar uma aula

1. Crie o arquivo `<tema>.html` na raiz, copiando a estrutura de uma aula existente (head padrão com o script inline de scroll, `<nav class="sidebar">`, `<div class="pager"></div>`, conteúdo, `<script src="assets/site.js?v=1">`).
2. Adicione a página na lista `NIVEIS` em `assets/site.js` (no nível e grupo certos). A lista gera o menu lateral, o selo de nível e os botões Anterior/Próximo.
3. Se a aula tiver missão no terminal simulado, use:

```html
<div class="try" data-goal="TEXTO QUE DEVE APARECER NA SAÍDA" data-solucao="comando">
<p class="try-task"><strong>Missão:</strong> …</p>
</div>
```

O simulador (`assets/redesim.js`) entende: `ping, curl, wget, dig, nslookup, traceroute, ip, ifconfig, ss, netstat, tcpdump, nmap, nc, telnet, hostname, whois, arp, route, cat /etc/hosts, cat /etc/resolv.conf, ssh` e shell básico (`clear, echo, help, exit, history`). Confira a saída real no próprio `redesim.js` antes de escrever o `data-goal`.

## Padrão de escrita

- Toda aula começa com `<p class="intro">` e uma caixa `<div class="note">` "Você vai aprender".
- Explique a ideia (com analogia) antes do comando; depois a anatomia (`<dl class="anatomy">`).
- Mostre a saída real em `<pre class="term">$ comando …</pre>`.
- Termine com `<div class="tip">` apontando a próxima aula.
- Erros reais em `<div class="warn">`.

## Testar local

Sirva a pasta com `python3 -m http.server` e abra `index.html` no navegador. O simulador carrega `assets/redesim.js` só nas páginas com `.try`.

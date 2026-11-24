/* =====================================================================
   Guia Redes — simulador de terminal de rede (redesim.js)
   ---------------------------------------------------------------------
   Um terminal fictício na máquina ana@notebook que entende os
   principais comandos de rede: ping, curl, wget, dig, nslookup,
   traceroute, ip, ss, netstat, tcpdump, nmap, nc, telnet, hostname,
   whois, arp, route, ifconfig, ssh (simulado), cat /etc/hosts...
   Roda só no navegador, montando as caixas <div class="try">.
   ===================================================================== */
(function () {
  "use strict";

  var USER = "ana", HOST = "notebook";

  /* ---------- Estado fictício da máquina ---------- */
  function estadoInicial() {
    return {
      hostname: "notebook",
      interfaces: [
        { nome: "lo", ip: "127.0.0.1/8", mac: "00:00:00:00:00:00", estado: "UNKNOWN" },
        { nome: "eth0", ip: "192.168.1.50/24", mac: "aa:bb:cc:dd:ee:ff", estado: "UP", gateway: "192.168.1.1" }
      ],
      gateway: "192.168.1.1",
      dns: ["192.168.1.1", "8.8.8.8"],
      hosts: [
        "127.0.0.1   localhost",
        "127.0.1.1   notebook",
        "192.168.1.50 notebook",
        "192.168.1.1  roteador gateway"
      ],
      // tabela DNS fictícia: domínio -> IP
      dnsTable: {
        "exemplo.com": "93.184.216.34",
        "www.exemplo.com": "93.184.216.34",
        "google.com": "142.250.72.142",
        "github.com": "140.82.121.4",
        "api.exemplo.com": "93.184.216.35",
        "meusite.local": "192.168.1.60",
        "roteador.local": "192.168.1.1"
      },
      // serviços rodando no notebook
      servicos: [
        { porta: 22, proto: "tcp", proc: "sshd" },
        { porta: 8000, proto: "tcp", proc: "python3 http.server" }
      ],
      // portas abertas em hosts remotos fictícios
      hostsRemotos: {
        "exemplo.com": { ip: "93.184.216.34", portas: { 80: "aberto", 443: "aberto" } },
        "api.exemplo.com": { ip: "93.184.216.35", portas: { 443: "aberto", 8080: "aberto" } },
        "google.com": { ip: "142.250.72.142", portas: { 80: "aberto", 443: "aberto" } }
      },
      // rotas para traceroute
      saltos: {
        "exemplo.com": ["192.168.1.1", "189.50.10.1", "200.147.67.142", "93.184.216.34"],
        "google.com": ["192.168.1.1", "189.50.10.1", "72.14.204.1", "142.250.72.142"]
      },
      // páginas fictícias para curl
      paginas: {
        "http://exemplo.com": { status: "200 OK", headers: ["HTTP/1.1 200 OK", "Server: nginx/1.25.3", "Content-Type: text/html; charset=UTF-8", "Content-Length: 1256", "Connection: keep-alive"], body: "<html><head><title>Exemplo</title></head><body><h1>Exemplo.com</h1><p>Esta é uma página fictícia do simulador.</p></body></html>" },
        "https://exemplo.com": { status: "200 OK", headers: ["HTTP/2 200", "server: nginx/1.25.3", "content-type: text/html; charset=UTF-8", "strict-transport-security: max-age=31536000"], body: "<html><head><title>Exemplo</title></head><body><h1>Exemplo.com (HTTPS)</h1></body></html>" },
        "https://api.exemplo.com/usuarios": { status: "200 OK", headers: ["HTTP/2 200", "content-type: application/json", "content-length: 87"], body: '[{"id":1,"nome":"Ana"},{"id":2,"nome":"Beto"},{"id":3,"nome":"Carla"}]' },
        "https://api.exemplo.com/usuarios/999": { status: "404 Not Found", headers: ["HTTP/2 404", "content-type: application/json"], body: '{"erro":"usuário não encontrado"}' },
        "http://exemplo.com/nao-existe": { status: "404 Not Found", headers: ["HTTP/1.1 404 Not Found", "Server: nginx/1.25.3", "Content-Type: text/html"], body: "<html><body><h1>404 Not Found</h1></body></html>" }
      },
      dnsOffline: false
    };
  }

  var estado = estadoInicial();

  /* ---------- utilidades ---------- */
  function resolverHost(host) {
    // tira porta se houver (host:porta)
    var h = host.split(":")[0].trim().toLowerCase();
    if (/^\d+\.\d+\.\d+\.\d+$/.test(h)) return h; // já é IP
    for (var i = 0; i < estado.hosts.length; i++) {
      var partes = estado.hosts[i].split(/\s+/);
      if (partes[1] === h || partes[2] === h) return partes[0];
    }
    if (estado.dnsTable[h]) return estado.dnsTable[h];
    if (estado.hostsRemotos[h]) return estado.hostsRemotos[h].ip;
    return null;
  }
  function pad(s, n) { s = String(s); while (s.length < n) s += " "; return s; }
  function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

  /* ---------- comandos ---------- */
  function cmdPing(args) {
    var host = args[0];
    if (!host) return "uso: ping [-c N] HOST";
    var count = 4;
    var m = /-c\s+(\d+)/.exec(args.join(" "));
    if (m) count = parseInt(m[1], 10);
    var ip = resolverHost(host);
    if (!ip) return "ping: cannot resolve " + host + ": Name or service not known";
    var out = "PING " + host + " (" + ip + ") 56(84) bytes of data.\n";
    for (var i = 0; i < count; i++) {
      out += "64 bytes from " + ip + ": icmp_seq=" + (i + 1) + " ttl=64 time=" + (ip.indexOf("192.168.") === 0 ? rand(1, 4) + "." + rand(10, 99) : rand(10, 60) + "." + rand(10, 99)) + " ms\n";
    }
    out += "\n--- " + host + " ping statistics ---\n";
    out += count + " packets transmitted, " + count + " received, 0% packet loss, time " + ((count - 1) * 1000) + "ms";
    return out;
  }

  function paginaDe(url) {
    var u = url.toLowerCase();
    if (estado.paginas[u]) return estado.paginas[u];
    // tenta sem barra final / com path genérico
    var base = u.replace(/\/+$/, "");
    if (estado.paginas[base]) return estado.paginas[base];
    for (var k in estado.paginas) {
      if (u.indexOf(k) === 0) return estado.paginas[k];
    }
    return null;
  }

  function cmdCurl(args) {
    if (!args.length) return "uso: curl [OPÇÕES] URL";
    var url = args[args.length - 1];
    var wantHeaders = args.indexOf("-i") !== -1 || args.indexOf("-I") !== -1;
    var verbose = args.indexOf("-v") !== -1;
    var headOnly = args.indexOf("-I") !== -1;
    var metodo = "GET";
    var mi = args.indexOf("-X");
    if (mi !== -1 && args[mi + 1]) metodo = args[mi + 1].toUpperCase();
    var dataIdx = args.indexOf("-d");
    var dados = dataIdx !== -1 ? args[dataIdx + 1] : null;
    if (!/^https?:\/\//i.test(url)) url = "http://" + url;

    var host = url.replace(/^https?:\/\//i, "").split("/")[0].split(":")[0];
    var ip = resolverHost(host);
    if (!ip) return "curl: (6) Could not resolve host: " + host;

    var pag = paginaDe(url);
    var out = "";
    if (verbose) {
      out += "* Trying " + ip + ":" + (/^https/i.test(url) ? 443 : 80) + "...\n";
      out += "* Connected to " + host + " (" + ip + ") port " + (/^https/i.test(url) ? 443 : 80) + "\n";
      out += "> " + metodo + " " + url.replace(/^https?:\/\//i, "") + " HTTP/1.1\n";
      out += "> Host: " + host + "\n> User-Agent: curl/8.5.0\n> Accept: */*\n";
      if (dados) out += "> Content-Type: application/json\n> Content-Length: " + dados.length + "\n";
      out += ">\n";
    }
    if (!pag) {
      // host resolve mas não tem página fictícia: devolve 200 genérica ou erro de conexão
      if (estado.hostsRemotos[host] && estado.hostsRemotos[host].portas[80] !== "aberto" && estado.hostsRemotos[host].portas[443] !== "aberto") {
        return "curl: (7) Failed to connect to " + host + " port " + (/^https/i.test(url) ? 443 : 80) + " after 2 ms: Connection refused";
      }
      pag = { status: "200 OK", headers: ["HTTP/1.1 200 OK", "Server: simulador", "Content-Type: text/html"], body: "<html><body><h1>" + host + "</h1><p>Página fictícia.</p></body></html>" };
    }
    if (wantHeaders) out += pag.headers.join("\n") + "\n\n";
    if (!headOnly) out += pag.body + "\n";
    if (verbose) out += "* Connection #0 to host " + host + " left intact\n";
    return out.trimEnd();
  }

  function cmdDig(args) {
    if (!args.length) return "uso: dig [@servidor] HOST [TIPO] [+short|+trace]";
    var trace = args.indexOf("+trace") !== -1;
    var short = args.indexOf("+short") !== -1;
    var tipo = "A";
    for (var i = 0; i < args.length; i++) {
      if (/^[A-Z]{1,5}$/.test(args[i]) && args[i] !== "+SHORT" && args[i].indexOf("+") !== 0 && args[i].indexOf("@") !== 0 && resolverHost(args[i]) === null && args[i] !== args[0]) {
        // heurística: se não é o host e parece tipo de registro
      }
    }
    var host = args.filter(function (a) { return a[0] !== "+" && a[0] !== "@"; })[0];
    var tipoArg = args.filter(function (a) { return /^(A|AAAA|CNAME|MX|TXT|NS|SOA|PTR)$/i.test(a); })[0];
    if (tipoArg) tipo = tipoArg.toUpperCase();
    if (estado.dnsOffline) return ";; connection timed out; no servers could be reached";
    var ip = resolverHost(host);
    if (short) return ip || "";
    if (trace) {
      var out = "; <<>> DiG 9.18 <<>> +trace " + host + "\n;; global options: +cmd\n";
      out += ".                       518400  IN  NS  a.root-servers.net.\n";
      out += ";; Received 239 bytes from 192.168.1.1#53(192.168.1.1) in 4 ms\n\n";
      out += "com.                    172800  IN  NS  a.gtld-servers.net.\n\n";
      out += "exemplo.com.            86400   IN  NS  ns1.exemplo.com.\n\n";
      out += "exemplo.com.            3600    IN  A   " + (ip || "NXDOMAIN") + "\n;; Query time: 38 msec\n;; SERVER: 8.8.8.8#53(8.8.8.8)\n;; WHEN: " + new Date().toUTCString();
      return out;
    }
    if (!ip) {
      return ";; ->>HEADER<<- opcode: QUERY, status: NXDOMAIN, id: " + rand(1000, 9999) + "\n;; QUESTION SECTION:\n;" + host + ".\t\tIN\t" + tipo + "\n\n;; ANSWER SECTION:\n\n;; Query time: 12 msec\n;; SERVER: 192.168.1.1#53(192.168.1.1)\n;; WHEN: " + new Date().toUTCString() + "\n;; MSG SIZE  rcvd: 31";
    }
    var out = ";; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: " + rand(1000, 9999) + "\n";
    out += ";; flags: qr rd ra; QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 1\n\n";
    out += ";; QUESTION SECTION:\n;" + host + ".\t\t\tIN\t" + tipo + "\n\n";
    out += ";; ANSWER SECTION:\n" + pad(host + ".", 32) + "3600\tIN\t" + tipo + "\t" + ip + "\n\n";
    out += ";; Query time: " + rand(2, 40) + " msec\n;; SERVER: 192.168.1.1#53(192.168.1.1)\n;; WHEN: " + new Date().toUTCString() + "\n;; MSG SIZE  rcvd: " + rand(48, 90);
    return out;
  }

  function cmdTraceroute(args) {
    var host = args[0];
    if (!host) return "uso: traceroute HOST";
    var ip = resolverHost(host);
    if (!ip) return "traceroute: unknown host " + host;
    var saltos = estado.saltos[host] || ["192.168.1.1", ip];
    var out = "traceroute to " + host + " (" + ip + "), 30 hops max, 60 byte packets\n";
    for (var i = 0; i < saltos.length; i++) {
      out += pad(" " + (i + 1), 3) + " " + pad(saltos[i], 18) + rand(2, 9) + "." + rand(100, 999) + " ms  " + rand(2, 9) + "." + rand(100, 999) + " ms  " + rand(2, 9) + "." + rand(100, 999) + " ms\n";
    }
    return out.trimEnd();
  }

  function cmdIp(args) {
    var sub = args[0] || "addr";
    if (sub === "addr" || sub === "a" || sub === "address") {
      var out = "";
      estado.interfaces.forEach(function (ifc, i) {
        out += (i + 1) + ": " + ifc.nome + ": <" + (ifc.estado === "UP" ? "BROADCAST,MULTICAST,UP,LOWER_UP" : "LOOPBACK,UP,LOWER_UP") + "> mtu 1500 qdisc noqueue state " + (ifc.estado === "UP" ? "UP" : "UNKNOWN") + "\n";
        out += "    link/" + (ifc.nome === "lo" ? "loopback" : "ether") + " " + ifc.mac + " brd " + (ifc.nome === "lo" ? "00:00:00:00:00:00" : "ff:ff:ff:ff:ff:ff") + "\n";
        out += "    inet " + ifc.ip + " scope " + (ifc.nome === "lo" ? "host" : "global") + " " + ifc.nome + "\n";
      });
      return out.trimEnd();
    }
    if (sub === "route" || sub === "r") {
      return "default via " + estado.gateway + " dev eth0 proto dhcp metric 100\n" +
             pad("192.168.1.0/24", 20) + " dev eth0 proto kernel scope link src 192.168.1.50 metric 100";
    }
    return "uso: ip [addr|route]";
  }

  function cmdSs(args) {
    var out = "Netid State  Recv-Q Send-Q Local Address:Port  Peer Address:Port Process\n";
    estado.servicos.forEach(function (s) {
      out += pad(s.proto.toUpperCase(), 6) + " LISTEN 0      128    0.0.0.0:" + s.porta + "          0.0.0.0:*     users:((\"" + s.proc.split(" ")[0] + "\"," + rand(100, 9999) + "))\n";
    });
    return out.trimEnd();
  }

  function cmdTcpdump(args) {
    var host = null, port = null;
    for (var i = 0; i < args.length; i++) {
      if (args[i] === "host") host = args[i + 1];
      if (args[i] === "port") port = args[i + 1];
    }
    var alvo = host ? resolverHost(host) || host : "8.8.8.8";
    var out = "tcpdump: listening on eth0, link-type EN10MB (Ethernet), snapshot length 262144 bytes\n";
    var linhas = 5;
    for (var j = 0; j < linhas; j++) {
      var t = new Date(Date.now() + j * 1000);
      out += t.toTimeString().split(" ")[0] + "." + String(100000 + j * 12345).slice(1) + " IP ";
      out += "192.168.1.50." + rand(40000, 65000) + " > " + alvo + "." + (port || (443 - j)) + ": Flags [S], seq " + rand(1000000, 9999999) + ", win 64240, length 0\n";
    }
    return out.trimEnd();
  }

  function cmdNmap(args) {
    var host = args[args.length - 1];
    if (!host || host.indexOf("-") === 0) return "uso: nmap [OPÇÕES] HOST";
    var ip = resolverHost(host);
    if (!ip) return "Nmap scan report for " + host + "\nHost seems down (cannot resolve).";
    var portas = (estado.hostsRemotos[host] && estado.hostsRemotos[host].portas) || { 22: "aberto", 80: "aberto", 443: "aberto" };
    var out = "Nmap scan report for " + host + " (" + ip + ")\nHost is up (0.0" + rand(10, 90) + "s latency).\n";
    out += "PORT    STATE  SERVICE\n";
    for (var p in portas) {
      out += pad(p + "/tcp", 8) + pad(portas[p] === "aberto" ? "open" : portas[p], 7) + (p === "22" ? "ssh" : p === "80" ? "http" : p === "443" ? "https" : "desconhecido") + "\n";
    }
    out += "\nNmap done: 1 IP address (1 host up) scanned in " + (rand(2, 9)) + "." + rand(10, 99) + " seconds";
    return out.trimEnd();
  }

  function cmdNc(args) {
    var host = null, port = null;
    for (var i = 0; i < args.length; i++) {
      if (args[i] === "-zv" || args[i] === "-z") continue;
      if (args[i][0] !== "-") { host = host || args[i]; port = port || args[i + 1]; }
    }
    if (!host || !port) return "uso: nc -zv HOST PORTA";
    var ip = resolverHost(host);
    if (!ip) return "nc: bad address '" + host + "'";
    var aberto = false;
    if (host === "localhost" || host === "127.0.0.1" || ip === "192.168.1.50") {
      aberto = estado.servicos.some(function (s) { return String(s.porta) === String(port); });
    } else if (estado.hostsRemotos[host]) {
      aberto = estado.hostsRemotos[host].portas[port] === "aberto";
    } else {
      aberto = (port === "80" || port === "443" || port === "22");
    }
    return "Connection to " + host + " " + port + " port [tcp/*] succeeded!" + (aberto ? "" : " (parece fechado)");
  }

  function cmdHelp() {
    return "Comandos disponíveis:\n" +
      "  ping HOST [-c N]      testa se o host responde\n" +
      "  curl [OPÇÕES] URL     faz requisição HTTP (use -i, -v, -X POST, -d '{}')\n" +
      "  wget URL              baixa um arquivo\n" +
      "  dig HOST [TIPO]       consulta DNS (+short, +trace)\n" +
      "  nslookup HOST         idem, saída simples\n" +
      "  traceroute HOST       mostra o caminho até o host\n" +
      "  ip addr | ip route    seus IPs e rotas\n" +
      "  ss -tlnp              portas abertas (escuta)\n" +
      "  netstat -tlnp         idem, formato antigo\n" +
      "  tcpdump -i eth0       captura pacotes\n" +
      "  nmap HOST             scan de portas (simulado)\n" +
      "  nc -zv HOST PORTA     testa se a porta abre\n" +
      "  telnet HOST PORTA     idem, estilo antigo\n" +
      "  hostname | whois | arp -a | route -n | ifconfig\n" +
      "  cat /etc/hosts | cat /etc/resolv.conf\n" +
      "  ssh USER@HOST         (simulado)\n" +
      "  clear, echo, help, exit, history";
  }

  function executar(linha) {
    linha = linha.trim();
    if (!linha) return "";
    var partes = linha.split(/\s+/);
    var cmd = partes[0];
    var args = partes.slice(1);

    switch (cmd) {
      case "ping": return cmdPing(args);
      case "curl": return cmdCurl(args);
      case "wget": {
        var u = args[args.length - 1];
        if (!u) return "uso: wget URL";
        if (!/^https?:\/\//i.test(u)) u = "http://" + u;
        var h = u.replace(/^https?:\/\//i, "").split("/")[0];
        if (!resolverHost(h)) return "wget: unable to resolve host address '" + h + "'";
        return "--" + new Date().toISOString().slice(0, 19).replace("T", " ") + "--  " + u + "\nResolving " + h + "... " + resolverHost(h) + "\nHTTP request sent, awaiting response... 200 OK\nLength: unspecified [text/html]\nSaving to: '" + (u.split("/").pop() || "index.html") + "'";
      }
      case "dig": return cmdDig(args);
      case "nslookup": {
        var h2 = args[0];
        if (!h2) return "uso: nslookup HOST";
        var ip2 = resolverHost(h2);
        if (!ip2) return "Server:\t\t192.168.1.1\nAddress:\t192.168.1.1#53\n\n** server can't find " + h2 + ": NXDOMAIN";
        return "Server:\t\t192.168.1.1\nAddress:\t192.168.1.1#53\n\nNon-authoritative answer:\nName:\t" + h2 + "\nAddress: " + ip2;
      }
      case "traceroute": return cmdTraceroute(args);
      case "ip": return cmdIp(args);
      case "ifconfig": return cmdIp(["addr"]);
      case "ss": return cmdSs(args);
      case "netstat": return cmdSs(args);
      case "tcpdump": return cmdTcpdump(args);
      case "nmap": return cmdNmap(args);
      case "nc": return cmdNc(args);
      case "telnet": {
        var th = args[0], tp = args[1];
        if (!th || !tp) return "uso: telnet HOST PORTA";
        return "Trying " + (resolverHost(th) || th) + "...\nConnected to " + th + ".\nEscape character is '^]'.";
      }
      case "hostname": return estado.hostname;
      case "whois": {
        var d = args[0];
        return "Domain Name: " + (d || "EXEMPLO.COM").toUpperCase() + "\nRegistry: Verisign\nCreation Date: 1995-08-14\nName Server: NS1." + (d || "EXEMPLO.COM").toUpperCase();
      }
      case "arp": return "Address                  HWtype  HWaddress           Flags Mask  Iface\n192.168.1.1              ether   00:11:22:33:44:55   C          eth0\n192.168.1.60             ether   66:77:88:99:aa:bb   C          eth0";
      case "route": return "Kernel IP routing table\nDestination     Gateway         Genmask         Flags Metric Ref    Use Iface\ndefault         192.168.1.1     0.0.0.0         UG    100    0        0 eth0\n192.168.1.0     0.0.0.0         255.255.255.0   U     100    0        0 eth0";
      case "cat": {
        if (args[0] === "/etc/hosts") return estado.hosts.join("\n");
        if (args[0] === "/etc/resolv.conf") return "nameserver " + estado.dns.join("\nnameserver ") + "\nsearch localdomain";
        return "cat: " + (args[0] || "") + ": No such file or directory (simulado)";
      }
      case "ssh": return "(simulado) Conectando em " + (args[0] || "") + "...\nThe authenticity of host can't be established. (simulado — digite 'exit' para voltar)";
      case "clear": return "\x1b[2J\x1b[H";
      case "echo": return args.join(" ");
      case "help": return cmdHelp();
      case "exit": return "(simulador) sessão encerrada — clique em Reiniciar para começar de novo.";
      case "history": return "(simulador) histórico desta caixa";
      case "sudo": {
        if (args[0] && args[0].indexOf("ping") === 0) return cmdPing(args.slice(1));
        return "sudo: " + (args[0] || "") + ": command not found (simulado)";
      }
      default:
        return cmd + ": command not found (simulado — digite 'help' para ver os comandos de rede)";
    }
  }

  /* ---------- Interface no navegador ---------- */
  function montarTerminal(container) {
    var historico = [];
    var histIdx = -1;

    container.classList.add("docker-term");

    var output = document.createElement("div");
    output.className = "term-output";
    var inputLine = document.createElement("div");
    inputLine.className = "term-input-line";
    var prompt = document.createElement("span");
    prompt.className = "term-prompt";
    prompt.textContent = USER + "@" + HOST + ":~$ ";
    var input = document.createElement("input");
    input.className = "term-input";
    input.setAttribute("autocomplete", "off");
    input.setAttribute("spellcheck", "false");
    input.setAttribute("autocapitalize", "off");
    inputLine.appendChild(prompt);
    inputLine.appendChild(input);
    container.appendChild(output);
    container.appendChild(inputLine);

    var boasVindas = document.createElement("div");
    boasVindas.className = "term-line term-welcome";
    boasVindas.textContent = "Máquina fictícia " + USER + "@" + HOST + " (rede 192.168.1.50, gateway 192.168.1.1). Digite 'help' ou 'ping exemplo.com'.";
    output.appendChild(boasVindas);

    function rolar() { output.scrollTop = output.scrollHeight; }

    function print(texto, classe) {
      var div = document.createElement("div");
      div.className = "term-line " + (classe || "");
      if (texto.indexOf("\x1b[2J") === 0) { output.innerHTML = ""; return; }
      div.textContent = texto;
      output.appendChild(div);
      rolar();
    }

    function rodarComando(linha) {
      print(USER + "@" + HOST + ":~$ " + linha, "term-cmd");
      historico.push(linha);
      histIdx = historico.length;
      var resultado = executar(linha);
      if (resultado) resultado.split("\n").forEach(function (l) {
        var classe = "term-out";
        if (/^(curl:|ping:|nc:|traceroute: unknown|cat:|sudo:|\*\* server|Nmap scan report.*down|.*command not found)/.test(l)) classe = "term-err";
        else if (/^(PING|Nmap done|Connection to .* succeeded|Resolving)/.test(l)) classe = "term-ok";
        print(l, classe);
      });
    }

    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        var v = input.value;
        input.value = "";
        rodarComando(v);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (histIdx > 0) { histIdx--; input.value = historico[histIdx] || ""; }
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (histIdx < historico.length - 1) { histIdx++; input.value = historico[histIdx]; }
        else { histIdx = historico.length; input.value = ""; }
      } else if (e.key === "l" && e.ctrlKey) { e.preventDefault(); output.innerHTML = ""; }
      else if (e.key === "c" && e.ctrlKey) { e.preventDefault(); print(USER + "@" + HOST + ":~$ ^C", "term-cmd"); input.value = ""; }
    });

    container.addEventListener("click", function () { input.focus({ preventScroll: true }); });
    setTimeout(function () { input.focus({ preventScroll: true }); }, 100);

    var goal = container.getAttribute("data-goal");
    var solucao = container.getAttribute("data-solucao");
    if (goal) {
      var checkMissao = setInterval(function () {
        if (output.textContent.indexOf(goal.replace(/^out:/, "")) !== -1) {
          clearInterval(checkMissao);
          var badge = document.createElement("div");
          badge.className = "term-missao-ok";
          badge.textContent = "✔ Missão cumprida!";
          container.appendChild(badge);
        }
      }, 500);
    }

    var toolbar = document.createElement("div");
    toolbar.className = "term-toolbar";
    var btnReiniciar = document.createElement("button");
    btnReiniciar.type = "button";
    btnReiniciar.className = "term-btn";
    btnReiniciar.textContent = "Reiniciar";
    btnReiniciar.addEventListener("click", function (e) {
      e.stopPropagation();
      estado = estadoInicial();
      output.innerHTML = "";
      var bv = document.createElement("div");
      bv.className = "term-line term-welcome";
      bv.textContent = "Máquina reiniciada. Rede 192.168.1.50/24, gateway 192.168.1.1.";
      output.appendChild(bv);
      input.value = "";
      input.focus({ preventScroll: true });
    });
    toolbar.appendChild(btnReiniciar);
    if (solucao) {
      var btnSol = document.createElement("button");
      btnSol.type = "button";
      btnSol.className = "term-btn";
      btnSol.textContent = "Ver comando";
      btnSol.addEventListener("click", function (e) {
        e.stopPropagation();
        input.value = solucao;
        input.focus({ preventScroll: true });
      });
      toolbar.appendChild(btnSol);
    }
    container.insertBefore(toolbar, container.firstChild);
  }

  function init() {
    document.querySelectorAll(".try").forEach(montarTerminal);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

export interface Repertorio {
  id: string;
  ownerId: string;
  ownerName?: string;
  isPublic: boolean;
  allowedEditors: string[];
  nome: string;
  titulo: string;
  autor: string;
  eixoTematico: string;
  tipoObra: string;
  ano?: string;
  citacaoChave?: string;
  resumo: string;
  criticas?: string;
  conexaoTemas?: string;
  exemploParagrafo?: string;
  tags: string[];
  imagemData?: string;
  favorito: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RepertorioFormInput {
  nome: string;
  titulo: string;
  autor: string;
  eixoTematico: string;
  tipoObra: string;
  ano: string;
  citacaoChave: string;
  resumo: string;
  criticas: string;
  conexaoTemas: string;
  exemploParagrafo: string;
  tags: string[];
  imagemData: string;
  favorito: boolean;
  isPublic: boolean;
}

export interface EditRequest {
  id: string;
  repertorioId: string;
  repertorioNome: string;
  ownerId: string;
  requesterId: string;
  requesterName: string;
  status: 'pending' | 'accepted' | 'rejected';
  message?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const EIXOS_TEMATICOS = [
  'Educação e Conhecimento',
  'Meio Ambiente e Sustentabilidade',
  'Tecnologia, Ciência e Sociedade',
  'Cidadania, Direitos Humanos e Democracia',
  'Cultura, Identidade e Memória',
  'Saúde, Bem-Estar e Bioética',
  'Trabalho, Economia e Desigualdade',
  'Comunicação, Mídia e Liberdade',
  'Justiça, Segurança e Estado',
] as const;

export const TIPOS_DE_OBRA = [
  'Filosofia / Sociologia',
  'Livro / Literatura',
  'Filme / Documentário',
  'Fato Histórico',
  'Legislação / Documento',
  'Artes Visuais',
  'Música / Poema',
  'Dado Estatístico / Estudo',
] as const;

export const CURATED_SEED_REPERTORIOS: Omit<
  Repertorio,
  'id' | 'ownerId' | 'ownerName' | 'allowedEditors' | 'createdAt' | 'updatedAt'
>[] = [
  {
    nome: 'Modernidade Líquida e Fragilidade dos Laços',
    titulo: 'Modernidade Líquida',
    autor: 'Zygmunt Bauman',
    eixoTematico: 'Tecnologia, Ciência e Sociedade',
    tipoObra: 'Filosofia / Sociologia',
    ano: '2000',
    citacaoChave:
      'Vivemos em tempos líquidos. Nada foi feito para durar, tampouco as relações humanas e as instituições sociais.',
    resumo:
      'Na obra Modernidade Líquida, o sociólogo polonês Zygmunt Bauman contrapõe a rigidez das instituições do século XX ("modernidade sólida") à fluidez contemporânea. As relações afetivas, o trabalho, o consumo e a própria construção da identidade tornam-se voláteis, imediatistas e descartáveis.',
    criticas:
      'Bauman denuncia como a lógica do hiperconsumo colonizou a subjetividade humana: pessoas e vínculos passam a ser avaliados como mercadorias que podem ser substituídas ao menor sinal de insatisfação, gerando ansiedade crônica, isolamento e enfraquecimento da solidariedade coletiva.',
    conexaoTemas:
      'Ideal para fundamentar temas sobre saúde mental na era digital, superficialidade nas redes sociais, hiperconsumo e descarte ambiental, precarização do trabalho ("uberização"), crise de empatia e enfraquecimento do engajamento cívico.',
    exemploParagrafo:
      'Sob a ótica do sociólogo Zygmunt Bauman, em sua obra "Modernidade Líquida", a sociedade contemporânea é marcada pela fluidez e pela efemeridade dos laços sociais, que se desfazem com a mesma rapidez com que são estabelecidos. Analogamente, observa-se no cenário atual que a hiperconexão digital, embora aproxime indivíduos virtualmente, tem acentuado o isolamento emocional e a fragilidade do apoio coletivo diante de crises de saúde mental.',
    tags: ['sociologia', 'consumismo', 'redes-sociais', 'individualismo', 'saude-mental'],
    favorito: true,
    isPublic: true,
    imagemData: '',
  },
  {
    nome: 'Cidadãos de Papel e Ineficácia Constitucional',
    titulo: 'O Cidadão de Papel',
    autor: 'Gilberto Dimenstein',
    eixoTematico: 'Cidadania, Direitos Humanos e Democracia',
    tipoObra: 'Livro / Literatura',
    ano: '1993',
    citacaoChave:
      'A cidadania no Brasil muitas vezes existe apenas na letra fria da lei, sem alcançar a concretude do cotidiano das populações vulneráveis.',
    resumo:
      'Gilberto Dimenstein analisa o abismo histórico no Brasil entre os direitos fundamentais amplamente assegurados pela Constituição Federal de 1988 e a realidade prática enfrentada pela população marginalizada. Embora a legislação seja avançada no papel, sua materialização esbarra na omissão estatal e na desigualdade estrutural.',
    criticas:
      'A obra expõe a seletividade da atuação do Estado brasileiro: garantias constitucionais básicas — como moradia digna, saúde pública, educação de qualidade e registro civil — funcionam como privilégios de classe em vez de direitos universais.',
    conexaoTemas:
      'Repertório curinga para qualquer problemática social brasileira em que haja lei protetiva mas falte efetivação prática: invisibilidade social, falta de saneamento básico, evasão escolar, déficit habitacional, acesso à justiça e inclusão de pessoas com deficiência.',
    exemploParagrafo:
      'De acordo com o escritor e jornalista Gilberto Dimenstein, na obra "O Cidadão de Papel", o Brasil convive com uma cidadania meramente formal, na qual garantias previstas na Constituição Federal de 1988 não se concretizam na vida prática das camadas vulneráveis. Nesse sentido, a precariedade do acesso a esse direito básico evidencia a negligência estatal em transformar o texto constitucional em políticas públicas efetivas.',
    tags: ['constituicao-1988', 'direitos-humanos', 'desigualdade', 'estado', 'cidadania'],
    favorito: true,
    isPublic: true,
    imagemData: '',
  },
  {
    nome: 'Banalidade do Mal e Alienação Moral',
    titulo: 'Eichmann em Jerusalém: Um Relato sobre a Banalidade do Mal',
    autor: 'Hannah Arendt',
    eixoTematico: 'Justiça, Segurança e Estado',
    tipoObra: 'Filosofia / Sociologia',
    ano: '1963',
    citacaoChave:
      'O mal mais extremo no mundo moderno não nasce necessariamente do fanatismo patológico, mas da incapacidade acrítica de pensar e julgar.',
    resumo:
      'Ao acompanhar o julgamento do oficial nazista Adolf Eichmann em Jerusalém, a filósofa política Hannah Arendt cunhou o conceito de "Banalidade do Mal". Eichmann não se apresentava como um monstro sádico, mas como um burocrata comum que cumpria ordens sem refletir sobre as consequências éticas de seus atos.',
    criticas:
      'Arendt demonstra que quando indivíduos abdicam da faculdade do pensamento crítico e normalizam injustiças sob o pretexto do costume, da burocracia ou da obediência cega, barbaridades tornam-se rotineiras e socialmente aceitas.',
    conexaoTemas:
      'Conecta-se diretamente a temas como discurso de ódio nas redes, violência contra minorias, indiferença social diante da população em situação de rua, cultura do cancelamento, trabalho análogo à escravidão e omissão coletiva frente a crimes ambientais.',
    exemploParagrafo:
      'Conforme postulado pela filósofa alemã Hannah Arendt no livro "Eichmann em Jerusalém", a "Banalidade do Mal" ocorre quando indivíduos e instituições normalizam injustiças graves por ausência de reflexão crítica sobre seus atos. Sob esse viés, a naturalização da intolerância e da exclusão no cotidiano brasileiro reflete uma postura acrítica da sociedade, que deixa de enxergar a violação da dignidade alheia como um problema urgente.',
    tags: ['etica', 'filosofia-politica', 'direitos-humanos', 'violencia', 'pensamento-critico'],
    favorito: false,
    isPublic: true,
    imagemData: '',
  },
  {
    nome: 'Vidas Secas e a Exclusão Socioespacial',
    titulo: 'Vidas Secas',
    autor: 'Graciliano Ramos',
    eixoTematico: 'Trabalho, Economia e Desigualdade',
    tipoObra: 'Livro / Literatura',
    ano: '1938',
    citacaoChave:
      'Fabiano sentia-se uma coisa, um bicho, privado até mesmo do domínio da linguagem para reivindicar sua dignidade.',
    resumo:
      'Romance modernista da segunda geração que retrata a trajetória cíclica da família de retirantes liderada por Fabiano e Sinhá Vitória no sertão nordestino. Oprimidos tanto pela seca severa quanto pelo latifúndio e pelo autoritarismo do "Soldado Amarelo", os personagens sofrem um processo de zoomorfização (desumanização).',
    criticas:
      'Graciliano Ramos evidencia que a miséria extrema não é mero fenômeno climático ou natural, mas fruto de uma estrutura socioeconômico excludente que nega educação, voz política e condições dignas de subsistência ao trabalhador pobre.',
    conexaoTemas:
      'Excelente repertório literário brasileiro para discutir insegurança alimentar e fome, desigualdade regional, precarização do trabalhador rural, analfabetismo funcional, migrações forçadas e impactos desiguais das mudanças climáticas.',
    exemploParagrafo:
      'Na obra modernista "Vidas Secas", de Graciliano Ramos, o protagonista Fabiano e sua família enfrentam a severa exclusão socioeconômica e o silenciamento imposto pela falta de instrução e amparo estatal. Fora da ficção, milhões de brasileiros ainda vivenciam condição análoga à retratada no romance, uma vez que a desigualdade estrutural perpetua a vulnerabilidade de populações historicamente marginalizadas.',
    tags: ['literatura-brasileira', 'modernismo', 'fome', 'desigualdade-social', 'linguagem'],
    favorito: true,
    isPublic: false,
    imagemData: '',
  },
  {
    nome: 'Sociedade do Cansaço e Autoexploração',
    titulo: 'Sociedade do Cansaço',
    autor: 'Byung-Chul Han',
    eixoTematico: 'Saúde, Bem-Estar e Bioética',
    tipoObra: 'Filosofia / Sociologia',
    ano: '2010',
    citacaoChave:
      'O sujeito de desempenho contemporâneo é senhor e soberano de si mesmo, mas acaba tornando-se simultaneamente vítima e agressor na busca incessante por produtividade.',
    resumo:
      'O filósofo sul-coreano Byung-Chul Han argumenta que a sociedade disciplinar do século XX (baseada na proibição e no "não pode", descrita por Foucault) deu lugar à "Sociedade do Desempenho" do século XXI, regida pelo imperativo da positividade tóxica ("você pode tudo").',
    criticas:
      'A coerção externa foi substituída pela autoexploração voluntária: o indivíduo cobra de si mesmo metas inalcançáveis de produtividade estética e profissional, resultando nas chamadas "doenças neuronais" do século XXI — síndrome de burnout, depressão e transtornos de ansiedade.',
    conexaoTemas:
      'Aplica-se com precisão cirúrgica a temas como esgotamento profissional (Burnout), estigma das doenças mentais, pressão estética e padrões irreais nas mídias digitais, hiperconectividade no trabalho e valorização do lazer e da saúde pública.',
    exemploParagrafo:
      'Para o filósofo sul-coreano Byung-Chul Han, no ensaio "Sociedade do Cansaço", o século XXI substituiu a coerção disciplinar externa pela cobrança interna incessante por alto desempenho, transformando o indivíduo em explorador de si mesmo. Tal lógica de hiperprodutividade explica a escalada alarmante de quadros de esgotamento físico e mental, como a síndrome de burnout, entre trabalhadores e estudantes.',
    tags: ['burnout', 'produtividade', 'saude-mental', 'trabalho', 'filosofia-contemporanea'],
    favorito: false,
    isPublic: false,
    imagemData: '',
  },
  {
    nome: 'Necropolítica e Seletividade Estatal',
    titulo: 'Necropolítica',
    autor: 'Achille Mbembe',
    eixoTematico: 'Cultura, Identidade e Memória',
    tipoObra: 'Filosofia / Sociologia',
    ano: '2003',
    citacaoChave:
      'A expressão máxima da soberania reside, em grande medida, no poder e na capacidade de ditar quem pode viver e quem deve ser deixado à própria sorte.',
    resumo:
      'Expandindo o conceito de biopoder de Michel Foucault, o filósofo e historiador camaronês Achille Mbembe analisa como Estados contemporâneos operam políticas de exclusão que submetem determinados grupos populacionais (especialmente populações negras, indígenas e periféricas) a condições precárias de existência.',
    criticas:
      'Mbembe evidencia que o racismo estrutural e a herança colonial criam "zonas de invisibilidade" onde a proteção estatal é suspensa e a vulnerabilidade social é naturalizada pelas instituições públicas.',
    conexaoTemas:
      'Fundamental para debates sobre racismo estrutural e ambiental, violência urbana nas periferias, demarcação e proteção de terras indígenas, desigualdade no acesso à saúde pública e preservação da memória afro-brasileira.',
    exemploParagrafo:
      'Segundo o filósofo camaronês Achille Mbembe, o conceito de "Necropolítica" define a atuação seletiva do Estado quando este negligencia a proteção e a infraestrutura de grupos historicamente racializados e periféricos. Dessa forma, a ausência de equipamentos públicos e saneamento nessas regiões não configura mero acaso administrativo, mas sim a reprodução de desigualdades históricas que precisam ser combatidas.',
    tags: ['racismo-estrutural', 'direitos-humanos', 'periferia', 'pos-colonialismo', 'estado'],
    favorito: false,
    isPublic: true,
    imagemData: '',
  },
];

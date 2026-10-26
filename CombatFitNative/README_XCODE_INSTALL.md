# GUIA DE INSTALAÇÃO: COMBATFIT (IOS + APPLE WATCH)
**Tecnologia:** Nativo Swift (SwiftUI), HealthKit, WatchConnectivity & Taptic Engine  
**Atleta:** 60 kg | **Metodologia:** Periodização Conjugada Fase 1 (Hariel Corrêa)

---

## 1. Estrutura do Projeto Criado

O código nativo completo está organizado na pasta:
`c:\Users\Pichau\Desktop\treino\CombatFitNative`

- **`Shared/`**: Modelos de dados e o motor de cálculo da periodização (`PeriodizationEngine.swift` e `WorkoutModels.swift`).
- **`CombatFitWatch/`**: Aplicativo do Apple Watch:
  - `WatchWorkoutView.swift`: Interface ergonômica com botões grandes para mãos com luva/bandagem e indicador de batimentos cardíacos ao vivo (BPM).
  - `WatchRestTimerView.swift`: Cronômetro regressivo com anel animado e **vibração forte no pulso (Taptic Engine)** quando o descanso acaba.
  - `WatchCadenceMetronomeView.swift`: Metrônomo tátil de 8 segundos que dá **pulsos físicos no pulso** a 1 toque/s ou 2 toques/s.
  - `WatchHealthKitManager.swift`: Inicia sessão nativa no HealthKit, mede calorias e batimentos cardíacos em tempo real e salva no Apple Health/Fitness.
- **`CombatFitIOS/`**: Aplicativo do iPhone:
  - `DashboardView.swift`: Painel com seleção dos dias da semana (Treinos A, B, C, Sprints 30m e Intervalados 200m), cálculo instantâneo de tonelagem e status de conexão com o relógio.
  - `WatchSyncService.swift`: Comunicação contínua via `WCSession` entre o iPhone e o relógio.

---

## 2. Como Compilar e Instalar no seu iPhone e Apple Watch

Você pode instalar gratuitamente usando o seu próprio Apple ID pessoal (não precisa pagar a conta de $99 da Apple):

### Passo 1: Abrir o Xcode (em um Mac)
1. No Xcode, vá em **File > New > Project**.
2. Selecione a aba **watchOS** e escolha o template **"iOS App with Watch App"**.
3. Nomeie o projeto como `CombatFit`.
4. Em *Interface*, selecione **SwiftUI** e linguagem **Swift**.

### Passo 2: Adicionar os Arquivos
1. Arraste a pasta `Shared` para o projeto do Xcode, marcando **ambos os targets** (`CombatFit` e `CombatFitWatch`).
2. Substitua os arquivos gerados pelas nossas pastas:
   - Os arquivos de `CombatFitIOS` no target do iPhone.
   - Os arquivos de `CombatFitWatch` no target do Apple Watch.

### Passo 3: Ativar as Permissões (Capabilities)
1. Clique no target **CombatFit** (iPhone) > aba **Signing & Capabilities**:
   - Adicione **HealthKit**.
2. Clique no target **CombatFitWatch** (Apple Watch) > aba **Signing & Capabilities**:
   - Adicione **HealthKit**.
   - Adicione **Background Modes** e marque **Workout Processing** (para o relógio continuar medindo os batimentos e vibrando mesmo quando você abaixar o braço).

### Passo 4: Conectar e Executar
1. Conecte o seu iPhone ao Mac pelo cabo USB (o Apple Watch conectado ao iPhone será detectado automaticamente).
2. No menu de dispositivos no topo do Xcode, selecione o seu **Apple Watch**.
3. Clique no botão de **Play (Build and Run)**.
4. O Xcode compilará e instalará os aplicativos instantaneamente no seu iPhone e no seu Apple Watch!

---

## 3. O que acontece no seu pulso durante o treino

1. **Ao Iniciar a Sessão:** O sensor traseiro do Apple Watch liga a luz verde, iniciando a captura contínua da sua **Frequência Cardíaca (BPM)** e cálculo de calorias ativas.
2. **Ao Terminar uma Série:** Você toca no botão verde grande `CONCLUIR SÉRIE` no relógio. Ele vibra de forma suave (`.start`), marca a série e abre a tela de descanso.
3. **Durante o Descanso:** Você pode largar o celular no chão ou no banco. Quando a contagem regressiva (ex: 90s ou 150s) zera, o relógio dá **dois toques firmes e inconfundíveis no pulso**, avisando que é hora da próxima série.
4. **Nos Tiros de Potência de 8 Segundos:** O modo Metrônomo do relógio dá toques rítmicos a 1 Hz ou 2 Hz no seu punho, guiando a cadência exata do movimento sem você precisar olhar para cronômetro nenhum!
5. **No Final do Treino:** O treino é salvo automaticamente no **Apple Fitness / Apple Health** como um treino de alta performance com duração, calorias, histórico de batimentos cardíacos e volume de carga levantada.

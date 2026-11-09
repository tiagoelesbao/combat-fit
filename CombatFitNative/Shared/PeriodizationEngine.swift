//
//  PeriodizationEngine.swift
//  CombatFit - Shared Periodization Engine
//  Metodologia: Periodização Conjugada Aplicada a Esportes de Combate (Hariel Corrêa)
//

import Foundation

public final class PeriodizationEngine {
    
    public static func getWeekStrengthPercentage(week: Int) -> Int {
        let base = 60
        let pct = base + (week - 1) * 5
        return min(100, max(60, pct))
    }
    
    public static func generateWeekWorkouts(athleteWeight: Double, week: Int) -> [String: WorkoutDay] {
        let strengthPct = getWeekStrengthPercentage(week: week)
        let strengthLoad = (athleteWeight * (Double(strengthPct) / 100.0) * 2.0).rounded() / 2.0
        // Terra Dinâmico (sexta): progride junto com a força máxima, mas 10 p.p. abaixo (submáximo/explosivo)
        let dynamicPct = min(90, max(50, strengthPct - 10))
        let mixedLoad50 = (athleteWeight * (Double(dynamicPct) / 100.0) * 2.0).rounded() / 2.0
        // Exercícios de potência/velocidade (Supino Velocidade, Push Press, Salto Vertical):
        // progridem de 30% para 50% BW (+5%/semana), teto de 50% porque acima disso perde a
        // cadência de 2 reps/s que é o objetivo do exercício.
        let powerPct = min(50, 30 + (week - 1) * 5)
        let powerLoad = (athleteWeight * (Double(powerPct) / 100.0) * 2.0).rounded() / 2.0
        
        // 1. Segunda: Treino A
        let segExercises = [
            Exercise(
                id: "terra_seg",
                name: "Levantamento Terra (Barra)",
                transferDescription: "Cadeia posterior, pegada e sustentação na esgrima e quedas",
                loadPercentageText: "\(strengthPct)% BW",
                targetWeight: strengthLoad,
                targetReps: 7,
                restDurationSeconds: 150,
                setsCount: 3
            ),
            Exercise(
                id: "supino_forca",
                name: "Supino Reto (Força)",
                transferDescription: "Potência de empurrada horizontal e blindagem torácica",
                loadPercentageText: "\(strengthPct)% BW",
                targetWeight: strengthLoad,
                targetReps: 7,
                restDurationSeconds: 120,
                setsCount: 3
            ),
            Exercise(
                id: "supino_vel",
                name: "Supino Reto (Velocidade)",
                transferDescription: "Via alática rápida (CP) - 2 reps/s por 8 segundos contínuos",
                loadPercentageText: "\(powerPct)% BW",
                targetWeight: powerLoad,
                targetReps: 16,
                restDurationSeconds: 90,
                isSpeedCadence: true,
                setsCount: 4
            ),
            Exercise(
                id: "landmine_punch",
                name: "Push Press Explosivo (Barra)",
                transferDescription: "Potência de empurrada vertical - extensão explosiva de quadril/joelho/ombro, mesmo RFD do arremesso de bola medicinal original",
                loadPercentageText: "\(powerPct)% BW",
                targetWeight: powerLoad,
                targetReps: 6,
                restDurationSeconds: 60,
                setsCount: 3
            ),
            Exercise(
                id: "core_pallof",
                name: "Prancha Lateral / Pallof Press",
                transferDescription: "Anti-rotação de core para absorção e potência rotacional",
                loadPercentageText: "Isométrico",
                targetWeight: 0.0,
                targetReps: 30,
                restDurationSeconds: 45,
                setsCount: 3
            )
        ]
        
        let seg = WorkoutDay(
            id: "seg",
            dayTitle: "Treino A: Força & Potência Superior",
            badge: "FORÇA MÁXIMA & EXPLOSÃO",
            description: "Full body conjugado com Terra e Supino para construção de base neuromuscular.",
            type: .gym,
            intensityText: "\(strengthPct)% BW (\(strengthLoad) kg)",
            exercises: segExercises,
            runningShots: []
        )
        
        // 2. Terça: Sprints Curtos (30m)
        let terShots = (1...8).map { RunningShot(roundNumber: $0, distanceMeters: 30) }
        let ter = WorkoutDay(
            id: "ter",
            dayTitle: "Velocidade Alática: Sprints Curtos",
            badge: "VELOCIDADE PURA (30M)",
            description: "8 tiros curtos de 30m na velocidade máxima para taxa de aceleração inicial.",
            type: .sprints,
            intensityText: "Peso Corporal (100% Velocidade)",
            exercises: [],
            runningShots: terShots
        )
        
        // 3. Quarta: Treino B
        let quaExercises = [
            Exercise(
                id: "agacho_forca",
                name: "Agachamento Traseiro (Back Squat)",
                transferDescription: "Base e potência de membros inferiores para chutes e defesa de quedas",
                loadPercentageText: "\(strengthPct)% BW",
                targetWeight: strengthLoad,
                targetReps: 7,
                restDurationSeconds: 150,
                setsCount: 3
            ),
            Exercise(
                id: "salto_barra",
                name: "Salto Vertical com Carga Leve",
                transferDescription: "Tripla extensão explosiva de tornozelo, joelho e quadril",
                loadPercentageText: "\(powerPct)% BW",
                targetWeight: powerLoad,
                targetReps: 6,
                restDurationSeconds: 90,
                isSpeedCadence: true,
                setsCount: 4
            ),
            Exercise(
                id: "remada_curvada",
                name: "Remada Curvada com Barra",
                transferDescription: "Força de puxada para clinch de Muay Thai e golas de Jiu-Jitsu",
                loadPercentageText: "\(strengthPct)% BW",
                targetWeight: strengthLoad,
                targetReps: 7,
                restDurationSeconds: 120,
                setsCount: 3
            ),
            Exercise(
                id: "barra_fixa",
                name: "Barra Fixa ou Puxada Frontal",
                transferDescription: "Controle de costas e pegadas firmes no combate",
                loadPercentageText: "BW / \(strengthPct)%",
                targetWeight: strengthLoad,
                targetReps: 6,
                restDurationSeconds: 90,
                setsCount: 3
            ),
            Exercise(
                id: "farmers_walk",
                name: "Farmer's Walk (Pegada)",
                transferDescription: "Pegada de aço e sustentação de trapézios para grappling",
                loadPercentageText: "Halteres 16-20kg",
                targetWeight: 36.0,
                targetReps: 35,
                restDurationSeconds: 60,
                setsCount: 3
            )
        ]
        
        let qua = WorkoutDay(
            id: "qua",
            dayTitle: "Treino B: Força & Puxada/Salto",
            badge: "FORÇA MÁXIMA & QUADRIL",
            description: "Full body focado em cadeia anterior, agachamentos e puxadas pesadas.",
            type: .gym,
            intensityText: "\(strengthPct)% BW (\(strengthLoad) kg)",
            exercises: quaExercises,
            runningShots: []
        )
        
        // 4. Quinta: Intervalados 200m
        let quiShots = (1...5).map { RunningShot(roundNumber: $0, distanceMeters: 200) }
        let qui = WorkoutDay(
            id: "qui",
            dayTitle: "Resistência Específica: Intervalados",
            badge: "RESISTÊNCIA LÁTICA (200M)",
            description: "5 repetições de 200m a 85-90% de velocidade máxima com descanso completo.",
            type: .intervals,
            intensityText: "Peso Corporal (Sub-máximo)",
            exercises: [],
            runningShots: quiShots
        )
        
        // 5. Sexta: Treino C
        let sexExercises = [
            Exercise(
                id: "terra_rapido",
                name: "Levantamento Terra Dinâmico",
                transferDescription: "Extensão violenta de quadril na transição de potência",
                loadPercentageText: "\(dynamicPct)% BW",
                targetWeight: mixedLoad50,
                targetReps: 6,
                restDurationSeconds: 120,
                setsCount: 3
            ),
            Exercise(
                id: "supino_misto",
                name: "Supino Reto Potência Mista",
                transferDescription: "Séries 1-2 Força (\(strengthPct)%, \(strengthLoad)kg) / Séries 3-4 Velocidade pura (\(powerPct)%, \(powerLoad)kg)",
                loadPercentageText: "\(strengthPct)% & \(powerPct)%",
                targetWeight: strengthLoad,
                targetReps: 7,
                restDurationSeconds: 90,
                setsCount: 4
            ),
            Exercise(
                id: "jump_lunges",
                name: "Afundo Alternado com Salto",
                transferDescription: "Potência unilateral para troca de base rápida no tatame",
                loadPercentageText: "Peso Corporal",
                targetWeight: 0.0,
                targetReps: 10,
                restDurationSeconds: 60,
                setsCount: 3
            ),
            Exercise(
                id: "db_snatch",
                name: "Dumbbell Snatch (Arranco)",
                transferDescription: "Força de aceleração vertical do chão até acima da cabeça",
                loadPercentageText: "Halter 10-12kg",
                targetWeight: 12.0,
                targetReps: 5,
                restDurationSeconds: 60,
                setsCount: 3
            ),
            Exercise(
                id: "core_hanging",
                name: "Elevação de Pernas na Barra",
                transferDescription: "Flexores de quadril e força do abdômen para joelhadas fortes",
                loadPercentageText: "Peso Corporal",
                targetWeight: 0.0,
                targetReps: 10,
                restDurationSeconds: 45,
                setsCount: 3
            )
        ]
        
        let sex = WorkoutDay(
            id: "sex",
            dayTitle: "Treino C: Potência Mista & Velocidade",
            badge: "POTÊNCIA MISTA & VELOCIDADE",
            description: "Estímulo combinado de força e velocidade máxima para transferência no combate.",
            type: .gym,
            intensityText: "Mista (30% a \(strengthPct)% BW)",
            exercises: sexExercises,
            runningShots: []
        )
        
        // 6. Sábado: Recuperação
        let sab = WorkoutDay(
            id: "sab",
            dayTitle: "Sábado: Mobilidade & Recuperação",
            badge: "REGENERAÇÃO",
            description: "Soltura articular, mobilidade de quadril/ombros e caminhada leve.",
            type: .recovery,
            intensityText: "Leve / Mobilidade",
            exercises: [],
            runningShots: []
        )
        
        // 7. Domingo: Descanso
        let dom = WorkoutDay(
            id: "dom",
            dayTitle: "Domingo: Descanso Total",
            badge: "RESET DO SNC",
            description: "Recuperação do sistema nervoso central e regeneração muscular.",
            type: .recovery,
            intensityText: "Descanso Total",
            exercises: [],
            runningShots: []
        )
        
        return [
            "seg": seg,
            "ter": ter,
            "qua": qua,
            "qui": qui,
            "sex": sex,
            "sab": sab,
            "dom": dom
        ]
    }
}

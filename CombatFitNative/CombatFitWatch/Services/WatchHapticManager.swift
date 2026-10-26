//
//  WatchHapticManager.swift
//  CombatFitWatch
//  Feedback Tátil (Taptic Engine) no pulso para o atleta
//

import WatchKit

public final class WatchHapticManager {
    public static let shared = WatchHapticManager()
    
    private init() {}
    
    /// Vibração quando a série é marcada
    public func playSetCompleted() {
        WKInterfaceDevice.current().play(.start)
    }
    
    /// Vibração forte e contínua avisando o fim do descanso
    public func playRestTimerFinished() {
        WKInterfaceDevice.current().play(.success)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
            WKInterfaceDevice.current().play(.notification)
        }
    }
    
    /// Pulso tátil para guiar a cadência de 8s da creatina fosfato (1 toque/s ou 2 toques/s)
    public func playCadenceTick() {
        WKInterfaceDevice.current().play(.click)
    }
    
    /// Alerta de contagem regressiva 3, 2, 1
    public func playCountdownTick() {
        WKInterfaceDevice.current().play(.directionUp)
    }
}

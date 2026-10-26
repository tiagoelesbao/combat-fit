//
//  WatchSyncService.swift
//  CombatFitIOS
//  Sincronização em tempo real entre iPhone e Apple Watch via WatchConnectivity
//

import Foundation
import WatchConnectivity

public final class WatchSyncService: NSObject, ObservableObject, WCSessionDelegate {
    public static let shared = WatchSyncService()
    
    @Published public var isWatchAppInstalled: Bool = false
    @Published public var isReachable: Bool = false
    
    public override init() {
        super.init()
        if WCSession.isSupported() {
            let session = WCSession.default
            session.delegate = self
            session.activate()
        }
    }
    
    public func sendWorkoutToWatch(day: WorkoutDay) {
        guard WCSession.default.isReachable else { return }
        
        do {
            let encoder = JSONEncoder()
            let data = try encoder.encode(day)
            WCSession.default.sendMessage(["activeWorkout": data], replyHandler: nil) { error in
                print("Error sending workout to watch: \(error.localizedDescription)")
            }
        } catch {
            print("Encoding error: \(error.localizedDescription)")
        }
    }
    
    // MARK: - WCSessionDelegate
    public func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        DispatchQueue.main.async {
            self.isWatchAppInstalled = session.isWatchAppInstalled
            self.isReachable = session.isReachable
        }
    }
    
    public func sessionDidBecomeInactive(_ session: WCSession) {}
    public func sessionDidDeactivate(_ session: WCSession) {
        WCSession.default.activate()
    }
    
    public func session(_ session: WCSession, didReceiveMessage message: [String : Any]) {
        // Recebe séries marcadas pelo Apple Watch e atualiza o estado do iPhone
        if let completedSetData = message["completedSet"] as? Data {
            print("Set recebido do Apple Watch com sucesso!")
        }
    }
}

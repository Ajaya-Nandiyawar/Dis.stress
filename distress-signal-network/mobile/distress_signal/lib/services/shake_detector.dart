import 'dart:async';
import 'dart:math';
import 'package:sensors_plus/sensors_plus.dart';
import '../constants/config.dart';

class ShakeDetector {
  StreamSubscription? _accelerometerSubscription;
  DateTime _lastShakeTime = DateTime.fromMillisecondsSinceEpoch(0);
  final Function onShake;

  ShakeDetector({required this.onShake});

  void startListening() {
    _accelerometerSubscription = accelerometerEventStream().listen((AccelerometerEvent event) {
      // Convert standard m/s^2 to G-force
      double gX = event.x / 9.80665;
      double gY = event.y / 9.80665;
      double gZ = event.z / 9.80665;

      // Calculate total G-force magnitude
      double gForce = sqrt(gX * gX + gY * gY + gZ * gZ);

      if (gForce > Config.shakeThresholdG) {
        final now = DateTime.now();
        if (now.difference(_lastShakeTime).inMilliseconds > Config.shakeCooldownMs) {
          _lastShakeTime = now;
          onShake(); // Trigger the callback
        }
      }
    });
  }

  void stopListening() {
    _accelerometerSubscription?.cancel();
  }
}
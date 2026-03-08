import 'package:flutter/material.dart';
import 'screens/home_screen.dart';

void main() {
  runApp(const DistressApp());
}

class DistressApp extends StatelessWidget {
  const DistressApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'DIST.RESS',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.red),
        useMaterial3: true,
      ),
      home: const HomeScreen(),
    );
  }
}
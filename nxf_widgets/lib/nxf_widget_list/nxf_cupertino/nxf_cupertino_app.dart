import 'package:flutter/cupertino.dart';

class NxfCupertinoApp extends StatelessWidget {
  final Widget home;

  const NxfCupertinoApp({super.key, required this.home});

  @override
  Widget build(BuildContext context) {
    return CupertinoApp(
      home: home,
    );
  }
}


import 'package:flutter/material.dart';

class NxfAnimatedSwitcher extends StatelessWidget {
  final Widget child;
  final Duration duration;

  const NxfAnimatedSwitcher({
    super.key,
    required this.child,
    this.duration = const Duration(milliseconds: 300),
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedSwitcher(
      duration: duration,
      child: child,
    );
  }
}
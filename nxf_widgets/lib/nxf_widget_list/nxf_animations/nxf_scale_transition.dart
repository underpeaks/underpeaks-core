import 'package:flutter/material.dart';

class NxfScaleTransition extends StatelessWidget {
  final Animation<double> animation;
  final Widget child;

  const NxfScaleTransition({
    super.key,
    required this.animation,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return ScaleTransition(
      scale: animation,
      child: child,
    );
  }
}
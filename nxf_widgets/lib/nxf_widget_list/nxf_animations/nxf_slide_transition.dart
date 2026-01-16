import 'package:flutter/material.dart';

class NxfSlideTransition extends StatelessWidget {
  final Animation<Offset> position;
  final Widget child;

  const NxfSlideTransition({
    super.key,
    required this.position,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return SlideTransition(
      position: position,
      child: child,
    );
  }
}
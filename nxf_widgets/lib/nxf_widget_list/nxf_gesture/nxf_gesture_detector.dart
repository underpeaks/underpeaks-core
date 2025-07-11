
import 'package:flutter/material.dart';

class NxfGestureDetector extends StatelessWidget {
  final Widget child;
  final VoidCallback? onTap;

  const NxfGestureDetector({
    super.key,
    required this.child,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: child,
    );
  }
}

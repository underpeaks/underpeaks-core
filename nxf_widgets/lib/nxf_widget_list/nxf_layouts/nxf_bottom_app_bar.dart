import 'package:flutter/material.dart';

class NxfBottomAppBar extends StatelessWidget {
  final Widget child;

  const NxfBottomAppBar({
    super.key,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return BottomAppBar(
      child: child,
    );
  }
}

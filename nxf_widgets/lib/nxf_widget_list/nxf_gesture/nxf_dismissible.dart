
import 'package:flutter/material.dart';

class NxfDismissible extends StatelessWidget {
  final Key keyValue;
  final Widget child;
  final DismissDirection direction;
  final void Function(DismissDirection)? onDismissed;

  const NxfDismissible({
    required this.keyValue,
    required this.child,
    this.direction = DismissDirection.endToStart,
    this.onDismissed,
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    return Dismissible(
      key: keyValue,
      direction: direction,
      onDismissed: onDismissed,
      child: child,
    );
  }
}


import 'package:flutter/material.dart';

class NxfDraggable<T> extends StatelessWidget {
  final T data;
  final Widget child;
  final Widget feedback;

  const NxfDraggable({
    super.key,
    required this.data,
    required this.child,
    required this.feedback,
  });

  @override
  Widget build(BuildContext context) {
    return Draggable(
      data: data,
      child: child,
      feedback: feedback,
    );
  }
}

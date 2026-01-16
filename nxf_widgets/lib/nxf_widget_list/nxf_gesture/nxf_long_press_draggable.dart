import 'package:flutter/material.dart';

class NxfLongPressDraggable<T> extends StatelessWidget {
  final T data;
  final Widget child;
  final Widget feedback;

  const NxfLongPressDraggable({
    super.key,
    required this.data,
    required this.child,
    required this.feedback,
  });

  @override
  Widget build(BuildContext context) {
    return LongPressDraggable(data: data, feedback: feedback, child: child);
  }
}

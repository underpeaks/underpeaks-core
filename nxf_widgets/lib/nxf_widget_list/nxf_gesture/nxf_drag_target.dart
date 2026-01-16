import 'package:flutter/material.dart';

class NxfDragTarget extends StatelessWidget {
  final Widget Function(BuildContext, List<dynamic>, List<dynamic>) builder;
  final void Function(DragTargetDetails<dynamic>)? onAccept;
  final bool Function(DragTargetDetails<dynamic>)? onWillAccept;

  const NxfDragTarget({
    super.key,
    required this.builder,
    this.onAccept,
    this.onWillAccept,
  });

  @override
  Widget build(BuildContext context) {
    return DragTarget(
      builder: builder,
      onWillAcceptWithDetails: onWillAccept,
      onAcceptWithDetails: onAccept,
    );
  }
}

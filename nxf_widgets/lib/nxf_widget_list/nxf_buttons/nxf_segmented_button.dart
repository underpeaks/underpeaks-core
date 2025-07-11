import 'package:flutter/material.dart';

class NxfSegmentedButton<T> extends StatelessWidget {
  final List<ButtonSegment<T>> segments;
  final T selected;
  final void Function(T) onSelectionChanged;

  const NxfSegmentedButton({
    super.key,
    required this.segments,
    required this.selected,
    required this.onSelectionChanged,
  });

  @override
  Widget build(BuildContext context) {
    return SegmentedButton<T>(
      segments: segments,
      selected: {selected},
      onSelectionChanged: (Set<T> newSelection) {
        if (newSelection.isNotEmpty) {
          onSelectionChanged(newSelection.first);
        }
      },
    );
  }
}

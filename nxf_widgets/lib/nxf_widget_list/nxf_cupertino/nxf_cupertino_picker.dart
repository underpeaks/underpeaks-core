import 'package:flutter/cupertino.dart';

class NxfCupertinoPicker extends StatelessWidget {
  final List<Widget> children;
  final double itemExtent;
  final ValueChanged<int> onSelectedItemChanged;
  final int initialItem;

  const NxfCupertinoPicker({
    super.key,
    required this.children,
    required this.itemExtent,
    required this.onSelectedItemChanged,
    this.initialItem = 0,
  });

  @override
  Widget build(BuildContext context) {
    return CupertinoPicker(
      itemExtent: itemExtent,
      onSelectedItemChanged: onSelectedItemChanged,
      scrollController: FixedExtentScrollController(initialItem: initialItem),
      children: children,
    );
  }
}

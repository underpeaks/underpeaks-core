import 'package:flutter/material.dart';

class NxfPopupMenu<T> extends StatelessWidget {
  final List<PopupMenuEntry<T>> items;
  final PopupMenuItemSelected<T>? onSelected;
  final Widget child;

  const NxfPopupMenu({
    super.key,
    required this.items,
    required this.child,
    this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    return PopupMenuButton<T>(
      itemBuilder: (context) => items,
      onSelected: onSelected,
      child: child,
    );
  }
}

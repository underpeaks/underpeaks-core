import 'package:flutter/material.dart';

class NxfPopupMenuButton<T> extends StatelessWidget {
  final List<PopupMenuEntry<T>> items;
  final Widget icon;
  final PopupMenuItemSelected<T> onSelected;

  const NxfPopupMenuButton({
    super.key,
    required this.items,
    required this.icon,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    return PopupMenuButton<T>(
      itemBuilder: (context) => items,
      onSelected: onSelected,
      icon: icon,
    );
  }
}

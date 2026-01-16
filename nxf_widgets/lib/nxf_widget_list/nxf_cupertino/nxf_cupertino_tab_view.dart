import 'package:flutter/cupertino.dart';

class NxfCupertinoTabView extends StatelessWidget {
  final Widget Function(BuildContext) builder;

  const NxfCupertinoTabView({
    super.key,
    required this.builder,
  });

  @override
  Widget build(BuildContext context) {
    return CupertinoTabView(
      builder: builder,
    );
  }
}
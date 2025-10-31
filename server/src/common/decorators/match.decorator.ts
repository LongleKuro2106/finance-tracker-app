import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export const Match = (
  property: string,
  validationOptions?: ValidationOptions,
) => {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'match',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          const constraints = args.constraints;
          if (
            !Array.isArray(constraints) ||
            constraints.length === 0 ||
            typeof constraints[0] !== 'string'
          ) {
            return false;
          }

          const relatedPropertyName: string = constraints[0];
          const validationObject = args.object as Record<string, unknown>;
          const relatedValue = validationObject[relatedPropertyName];

          return value === relatedValue;
        },
      },
    });
  };
};
